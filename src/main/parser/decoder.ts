// Decoder: a component of the parser used to convert CDIFValue objects to JS values

import * as ss from "superstruct";
import {Describe} from "superstruct";
import CDIF from "../cdif.js";
import * as ssx from "../extensions/ss-util.js";
import {CDIFValue} from "../general.js";
import CDIFPrimitiveValue from "../primitive-value.js";
import CDIFStructure from "../structure.js";
import {ParserOptions} from "./parser.js";

/**
 * A function used to customize parsing behavior, ex. to create objects of the correct type.
 * @note return `{value: unknown}` to replace the value, `CDIF.OMIT_PROPERTY` to omit the property, or void to try the next preprocessor
 */
export interface ParserPostprocessorFunction { // Exported by main.ts
	(data: {
		/** The key of the property being postprocessed (or `null` for the root value) */
		key: null | string | number;
	} & (
		{
			/** The type name of the structure */
			type: undefined;
			/** The value to postprocess */
			value: unknown;
		} | {
			/** The type name of the structure */
			type: string;
			/** The value to postprocess */
			value: object;
		}
	)): PostprocessorResult | typeof CDIF.OMIT_PROPERTY | void;
}

type PostprocessorResult = {value: unknown};

/**
 * @param key the key of the property being parsed (or `null` for the root value)
 * @param value the `CDIFValue` to parse
 * @param options
 * @param cdifVersion
 * @returns `{value}` where `value` is the parsed value, or `undefined` if the value should be omitted
 */
export default function decodeCdifValue(
	key: null | string | number,
	value: CDIFValue,
	options: Required<ParserOptions>,
	cdifVersion: number
): {value: unknown} | undefined {
	const decodedValueWithType: {type: undefined, value: unknown} | {type: string, value: object} = (
		value instanceof CDIFStructure
	) ? {
		type: value.type,
		value: value.decode(options, cdifVersion)
	} : {
		type: undefined,
		value: decodeCdifPrimitiveValue(value, options, cdifVersion)
	};
	const res: PostprocessorResult | typeof CDIF.OMIT_PROPERTY = runPostprocessors(
		{key, ...decodedValueWithType}, options.postprocessors
	);
	if (res === CDIF.OMIT_PROPERTY) {return undefined;}
	return res;
}

function decodeCdifPrimitiveValue(
	value: CDIFPrimitiveValue,
	options: Required<ParserOptions>,
	cdifVersion: number
): unknown {
	if (value.cdifVersion !== cdifVersion) {
		// shouldn't happen in the decoder; its values are from the parser which is using the same version
		throw new Error(`cDIF primitive value version mismatch (expected ${cdifVersion}, got ${value.cdifVersion})`);
	}
	let res: unknown = value.parsed;
	if (!options.useBigInt && (typeof res === "bigint")) {res = Number(res);}
	return res;
}

function runPostprocessors(
	data: Parameters<ParserPostprocessorFunction>[0],
	postprocessors: ReadonlyArray<ParserPostprocessorFunction>
): PostprocessorResult | typeof CDIF.OMIT_PROPERTY {
	for (const postprocessor of postprocessors) {
		const res = postprocessor(data);
		if (res === undefined) {
			continue;
		} else if ((res === CDIF.OMIT_PROPERTY) || ss.is(res, struct_PostprocessorResult)) {
			return res;
		} else {
			throw new TypeError(`Postprocessor function returned unexpected value`);
		}
	}
	return {value: data.value};
}

// type validation:

export const struct_ParserPostprocessorFunction = ssx.defineFunc<ParserPostprocessorFunction>(
	"ParserPostprocessorFunction", 1
);

const struct_PostprocessorResult: Describe<PostprocessorResult> = ss.object({value: ss.unknown()});
