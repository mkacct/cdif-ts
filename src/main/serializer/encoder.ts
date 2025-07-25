// Encoder: a component of the serializer used to convert JS values to CDIFValue objects

import {between, isValue} from "@mkacct/ts-util";
import sw from "@mkacct/ts-util/switch";
import * as ss from "superstruct";
import CDIF from "../cdif.js";
import {CDIFError, CDIFTypeError} from "../errors.js";
import {ss_defineFunc, ss_tsObject} from "../extensions/ss-util.js";
import {CDIFValue, isObject} from "../general.js";
import {SerializerOptions} from "../options.js";
import CDIFPrimitiveValue, {CDIFBoolean, CDIFFloat, CDIFInfinite, CDIFInteger, CDIFNull, CDIFString} from "../primitive-value.js";
import CDIFStructure, {CDIFCollection, CDIFObject} from "../structure.js";

/**
 * A function used to customize serialization behavior and/or add type names.
 * @note return `{value: unknown, type?: string}` (`type` is only allowed if `value` is an object) to replace the value and/or add a type name, `CDIF.OMIT_PROPERTY` to omit the property, or void to try the next preprocessor
 */
export type SerializerPreprocessorFunction = (data: {
	/** The key of the property being preprocessed (or `null` for the root value) */
	key: null | string | number;
	/** The value to preprocess */
	value: unknown;
}) => PreprocessorResult | typeof CDIF.OMIT_PROPERTY | void;

type PreprocessorResult = (
	{value: unknown}
	| {type: string, value: object}
);

/**
 * @param key the key of the property being encoded (or `null` for the root value)
 * @param value the value to encode
 * @param options
 * @param cdifVersion
 * @param refs set of parent objects, for detecting circular references
 * @returns the encoded `CDIFValue`, or `undefined` if the value should be omitted
 * @throws {CDIFError} if `value` is a `CDIFPrimitiveValue` created with the wrong cDIF version
 * @throws {CDIFError} in strict mode, if a preprocessor function tries to omit a collection value
 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
 * @throws {CDIFTypeError} if a circular reference is encountered
 * @throws {CDIFTypeError} in strict mode, if `value` is of a disallowed type
 */
export default function encodeCdifValue(
	key: null | string | number,
	value: unknown,
	options: Required<SerializerOptions>,
	cdifVersion: number,
	refs: WeakSet<object> = new WeakSet<object>()
): CDIFValue | undefined {
	if (value instanceof CDIFPrimitiveValue) {
		if (value.cdifVersion !== cdifVersion) {
			throw new CDIFError(
				`cDIF primitive value version mismatch (expected ${cdifVersion}, got ${value.cdifVersion})`
			);
		}
		return value; // already encoded
	}

	const res: PreprocessorResult | typeof CDIF.OMIT_PROPERTY = runPreprocessors({key, value}, options.preprocessors);
	if (res === CDIF.OMIT_PROPERTY) {return undefined;}
	value = res.value;
	if (isObject(value)) {
		const type: string | undefined = ("type" in res) ? res.type : undefined;
		if (refs.has(value)) {throw new CDIFTypeError(`Circular structure detected`);}
		refs.add(value);
		const structure: CDIFStructure = Array.isArray(value)
			? encodeCdifCollection(value, type, options, cdifVersion, refs)
			: encodeCdifObject(value, type, options, cdifVersion, refs);
		refs.delete(value);
		return structure;
	} else {
		return encodeCdifPrimitiveValue(value, options, cdifVersion);
	}
}

function encodeCdifCollection(
	obj: ReadonlyArray<unknown>,
	type: string | undefined,
	options: Required<SerializerOptions>,
	cdifVersion: number,
	refs: WeakSet<object>
): CDIFCollection {
	const data: CDIFValue[] = [];
	for (const [key, value] of (obj as unknown[]).entries()) { // enumerable own properties only
		const encodedValue = encodeCdifValue(key, value, options, cdifVersion, refs);
		if (encodedValue) {
			data.push(encodedValue);
		} else {
			if (options.strict) {throw new CDIFError(`Collection value was omitted`);}
			data.push(new CDIFNull(cdifVersion));
		}
	}
	return new CDIFCollection(data, type);
}

function encodeCdifObject(
	obj: object,
	type: string | undefined,
	options: Required<SerializerOptions>,
	cdifVersion: number,
	refs: WeakSet<object>
): CDIFObject {
	const data = new Map<string, CDIFValue>();
	for (const [key, value] of Object.entries(obj) as [string, unknown][]) { // enumerable own properties only
		const encodedValue = encodeCdifValue(key, value, options, cdifVersion, refs);
		if (encodedValue) {
			data.set(key, encodedValue);
		} // else omit property (regardless of strict mode)
	}
	return new CDIFObject(data, type);
}

function runPreprocessors(
	data: Parameters<SerializerPreprocessorFunction>[0],
	preprocessors: ReadonlyArray<SerializerPreprocessorFunction>
): PreprocessorResult | typeof CDIF.OMIT_PROPERTY {
	for (const preprocessor of preprocessors) {
		const res = preprocessor(data);
		if (res === undefined) {
			continue;
		} else if ((res === CDIF.OMIT_PROPERTY) || ss.is(res, struct_PreprocessorResult)) {
			return res;
		} else {
			throw new TypeError(`Preprocessor function returned unexpected value`);
		}
	}
	return {value: data.value};
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
	const match = strRep.match(
		/^(?<sign>[+-])?(?<significand>(?:0|[1-9]\d*)(?:\.\d*[1-9])?)(?:e(?<exponent>[+-]?\d+))?$/us
	);
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

// type validation:

export const struct_SerializerPreprocessorFunction = ss_defineFunc<SerializerPreprocessorFunction>(
	"SerializerPreprocessorFunction", 1
);

const struct_PreprocessorResult = ss.union([ // this is beyond the capabilities of Describe :(
	ss.object({value: ss.unknown()}),
	ss.object({type: ss.string(), value: ss_tsObject()})
]);
