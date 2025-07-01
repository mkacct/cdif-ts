import CDIF from "../cdif.js";
import {ss_defineFunc} from "../extensions/ss-util.js";
import {CDIFValue} from "../general.js";
import {ParserOptions} from "../options.js";
import CDIFPrimitiveValue from "../primitive-value.js";
import CDIFStructure from "../structure.js";

/**
 * A function used to customize parsing behavior, ex. to create objects of the correct type.
 * @note return `{value: unknown}` to replace the value, `CDIF.OMIT_PROPERTY` to omit the property, or void to try the next preprocessor
 */
export type ParserPostprocessorFunction = (data: {
	/** The key of the property being postprocessed (or `null` for the root value) */
	key: null | string | number;
} & (
	{
		/** The value to postprocess */
		value: unknown;
	} | {
		/** The type name of the structure */
		type: string;
		/** The value to postprocess */
		value: object;
	}
)) => PostprocessorResult | typeof CDIF.OMIT_PROPERTY | void;

type PostprocessorResult = {value: unknown};

/**
 * @param key the key of the property being parsed (or `null` for the root value)
 * @param value the `CDIFValue` to parse
 * @param options
 * @param cdifVersion
 * @returns `{value}` where `value` the parsed value, or `undefined` if the value should be omitted
 */
export function decodeCdifValue(
	key: null | string | number,
	value: CDIFValue,
	options: Required<ParserOptions>,
	cdifVersion: number
): {value: unknown} | undefined {
	const type: string | undefined = (value instanceof CDIFStructure) ? value.type : undefined;
	const decoded: unknown = (value instanceof CDIFPrimitiveValue)
		? decodeCdifPrimitiveValue(value, options, cdifVersion)
		: value.decode(options, cdifVersion);
	const res: PostprocessorResult | typeof CDIF.OMIT_PROPERTY = runPostprocessors(
		key, decoded, type, options.postprocessors
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
		// shouldn't happen in the decoder; its values are from the parser using the same version
		throw new Error(`cDIF primitive value version mismatch (expected ${cdifVersion}, got ${value.cdifVersion})`);
	}
	let res: unknown = value.parsed;
	if (!options.useBigInt && (typeof res === "bigint")) {res = Number(res);}
	return res;
}

function runPostprocessors(
	key: null | string | number,
	value: unknown,
	type: string | undefined,
	postprocessors: ReadonlyArray<ParserPostprocessorFunction>
): PostprocessorResult | typeof CDIF.OMIT_PROPERTY {
	for (const postprocessor of postprocessors) {
		const res = postprocessor({key, type, value});
		if (res) {return res;}
	}
	return {value};
}

// type validation:

export const struct_ParserPostprocessorFunction = ss_defineFunc<ParserPostprocessorFunction>(
	"ParserPostprocessorFunction", 1
);
