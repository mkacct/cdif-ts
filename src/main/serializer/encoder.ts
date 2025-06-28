import {between, isValue} from "@mkacct/ts-util";
import sw from "@mkacct/ts-util/switch";
import CDIF from "../cdif.js";
import {CDIFError, CDIFTypeError} from "../errors.js";
import {CDIFValue} from "../general.js";
import {SerializerOptions} from "../options.js";
import CDIFPrimitiveValue, {CDIFBoolean, CDIFFloat, CDIFInfinite, CDIFInteger, CDIFNull, CDIFString} from "../primitive-value.js";
import CDIFStructure, {CDIFCollection, CDIFObject} from "../structure.js";

/**
 * A function used to customize serialization behavior and/or add type names.
 * @note return `{value: unknown, type?: string}` (`type` is only allowed if `value` is an object) replace the value and/or add a type name, `CDIF.SERIALIZER_OMIT_PROPERTY` to omit the property, or void to try the next preprocessor
 */
export type SerializerPreprocessorFunction = ({
	key, value
}: {
	/** The key of the property being preprocessed (or `null` for the root value) */
	key: null | string | number;
	/** The value to preprocess */
	value: unknown;
}) => PreprocessorResult | typeof CDIF.SERIALIZER_OMIT_PROPERTY | void;

type PreprocessorResult = (
	{value: unknown}
	| {type: string, value: object}
);

/**
 * @param key the key of the property being serialized (or `null` for the root value)
 * @param value the value to serialize
 * @param options
 * @param cdifVersion
 * @returns the serialized `CDIFValue`, or `undefined` if the value should be omitted
 * @throws {CDIFError} if `value` is a `CDIFPrimitiveValue` created with the wrong cDIF version
 * @throws {CDIFError} in strict mode, if a preprocessor function tries to omit a collection value
 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
 * @throws {CDIFTypeError} in strict mode, if `value` is of a disallowed type
 */
export function encodeCdifValue(
	key: null | string | number,
	value: unknown,
	options: Required<SerializerOptions>,
	cdifVersion: number
): CDIFValue | undefined {
	if (value instanceof CDIFPrimitiveValue) {
		if (value.cdifVersion !== cdifVersion) {
			throw new CDIFError(`cDIF primitive value version mismatch (expected ${cdifVersion}, got ${value.cdifVersion})`);
		}
		return value; // already encoded
	}

	const res = runPreprocessors(key, value, options.preprocessors);
	if (res === CDIF.SERIALIZER_OMIT_PROPERTY) {return undefined;}
	value = res.value;
	if ((typeof value === "object") && (value !== null)) {
		const type: string | undefined = ("type" in res) ? res.type : undefined;
		return encodeCdifStructure(value, type, options, cdifVersion);
	} else {
		return encodeCdifPrimitiveValue(value, options, cdifVersion);
	}
}

function encodeCdifStructure(
	obj: object,
	type: string | undefined,
	options: Required<SerializerOptions>,
	cdifVersion: number
): CDIFStructure {
	if (Array.isArray(obj)) {
		const data: CDIFValue[] = [];
		for (const [key, value] of (obj as unknown[]).entries()) { // enumerable own properties only
			const encodedValue = encodeCdifValue(key, value, options, cdifVersion);
			if (isValue(encodedValue)) {
				data.push(encodedValue);
			} else {
				if (options.strict) {throw new CDIFError(`Collection value was omitted`);}
				data.push(new CDIFNull(cdifVersion));
			}
		}
		return new CDIFCollection(data, type);
	} else {
		const data = new Map<string, CDIFValue>();
		for (const [key, value] of Object.entries(obj) as [string, unknown][]) { // enumerable own properties only
			const encodedValue = encodeCdifValue(key, value, options, cdifVersion);
			if (isValue(encodedValue)) {
				data.set(key, encodedValue);
			} // else omit property (regardless of strict mode)
		}
		return new CDIFObject(data, type);
	}
}

function runPreprocessors(
	key: null | string | number,
	value: unknown,
	preprocessors: ReadonlyArray<SerializerPreprocessorFunction>
): PreprocessorResult | typeof CDIF.SERIALIZER_OMIT_PROPERTY {
	for (const preprocessor of preprocessors) {
		const res = preprocessor({key, value});
		if (isValue(res)) {return res;}
	}
	return {value};
}

function encodeCdifPrimitiveValue(
	value: unknown,
	options: Required<SerializerOptions>,
	cdifVersion: number
): CDIFPrimitiveValue | undefined {
	switch (typeof value) {
		case "undefined": {return undefined;}
		case "number": {
			if (isNaN(value)) {
				if (options.strict) {throw new CDIFTypeError(`Cannot serialize NaN`);}
				return new CDIFNull(cdifVersion);
			}
			if (!isFinite(value)) {
				return new CDIFInfinite(value < 0, cdifVersion);
			}
			return encodeCdifFloat(value.toString(), cdifVersion);
		}
		case "bigint": {
			return new CDIFInteger(value, cdifVersion);
		}
		case "string": {
			return encodeCdifString(value, cdifVersion);
		}
		case "boolean": {
			return new CDIFBoolean(value, cdifVersion);
		}
		case "symbol": {
			if (options.strict) {throw new CDIFTypeError(`Cannot serialize symbol`);}
			return undefined;
		}
		case "function": {
			if (options.strict) {throw new CDIFTypeError(`Cannot serialize function`);}
			return undefined;
		}
		case "object": { // null
			if (value === null) {return new CDIFNull(cdifVersion);}
			throw new TypeError(`Attempted to serialize object as primitive value`);
		}
	}
}

function encodeCdifFloat(strRep: string, cdifVersion: number): CDIFFloat {
	const match = strRep.match(/^(?<sign>[+-])?(?<significand>(?:0|[1-9]\d*)(?:\.\d*[1-9])?)(?:e(?<exponent>[+-]?\d+))?$/us);
	if (!match) {throw new Error(`Failed to parse floating point representation: "${strRep}"`);}
	let {sign, significand, exponent} : {
		sign?: string;
		significand?: string;
		exponent?: string;
	} = match.groups!;
	if (!isValue(significand)) {throw new Error(`Floating point representation missing significand: "${strRep}"`);}
	if (!significand.includes(".")) {significand += ".";}
	if (!isValue(exponent)) {exponent = "0";}
	return new CDIFFloat(sign === "-", significand, BigInt(exponent), cdifVersion);
}

function encodeCdifString(str: string, cdifVersion: number): CDIFString {
	const entities: string[] = [];
	for (const char of str) {
		entities.push(sw(char, [
			["\\", () => "\\\\"],
			[(char) => /^\P{C}$/us.test(char), () => char],
			["\b", () => "\\b"],
			["\f", () => "\\f"],
			["\n", () => "\\n"],
			["\r", () => "\\r"],
			["\t", () => "\\t"],
			["\v", () => "\\v"],
			[sw.DEFAULT, (char) => {
				const hex = char.codePointAt(0)!.toString(16).toUpperCase();
				return sw(hex.length, [
					[(len) => between(len, 0, 4), () => "\\u" + hex.padStart(4, "0")],
					[(len) => between(len, 5, 8), () => "\\U" + hex.padStart(8, "0")],
					[sw.DEFAULT, () => {throw new Error(`Unexpectedly large code point: ${hex}`);}]
				]);
			}]
		]));
	}
	return new CDIFString(entities, cdifVersion);
}
