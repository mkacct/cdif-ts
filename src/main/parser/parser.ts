// Main file for the parser

import * as ss from "superstruct";
import {Describe} from "superstruct";
import {CDIFError} from "../errors.js";
import * as ssx from "../extensions/ss-util.js";
import {CDIFValue} from "../general.js";
import decodeCdifValue, {ParserPostprocessorFunction, struct_ParserPostprocessorFunction} from "./decoder.js";
import parseCdifTokens from "./proper/parser-proper.js";
import tokenizeCdifFile, {Token} from "./tokenizer.js";

export interface ParserOptions {
	/**
	 * If `true`, integer values will be parsed as `bigint`
	 * to preserve precision of large integers
	 * (defaults to `false`)
	 */
	readonly useBigInt?: boolean;
	/**
	 * Array of functions (in order of precedence) called for each value after parsing,
	 * used to customize behavior, ex. to create objects of the correct type
	 * (see docs for details)
	 */
	readonly postprocessors?: ReadonlyArray<ParserPostprocessorFunction>;
	/**
	 * If `true`, the version string in a "cDIF" directive will not be validated;
	 * if `false`, an error will be thrown if the "cDIF" directive is invalid or does not match the cDIF version
	 * (defaults to `false`)
	 */
	readonly allowUnexpectedVersionString?: boolean;
}

/**
 * Converts a cDIF string to a JS value.
 * @param cdifText a valid cDIF string (read from a file or otherwise)
 * @param cdifVersion integer major version of the cDIF specification
 * @param parserOptions customize the behavior of the parser
 * @returns `cdifText` converted to a JS value (usually an object or array)
 * @throws {CDIFError} if a postprocessor function tries to omit the root value
 * @throws {CDIFSyntaxError} if the input has invalid syntax
 * @throws {CDIFDirectiveError} if an unknown directive is encountered, or a directive is used incorrectly
 * @throws {CDIFDirectiveError} if `allowUnexpectedVersionString` is false and the "cDIF" directive is used with an unexpected version string
 * @throws {CDIFReferenceError} if a component reference is not defined
 * @throws {CDIFReferenceError} if a circular component reference is encountered
 * @throws {CDIFTypeError} if a spread expression is used with a component of the wrong type
 */
export default function runParser(
	cdifText: string, cdifVersion: number, parserOptions: ParserOptions
): unknown {
	const reqOptions: Required<ParserOptions> = parseParserOptions(parserOptions);
	const tokens: Token[] = tokenizeCdifFile(cdifText);
	const parsedCdifValue: CDIFValue = parseCdifTokens(tokens, reqOptions, cdifVersion);
	const res: {value: unknown} | undefined = decodeCdifValue(null, parsedCdifValue, reqOptions, cdifVersion);
	if (!res) {throw new CDIFError(`Root value was omitted`);}
	return res.value;
}

/**
 * @param parserOptions
 * @returns `parserOptions` with defaults applied
 */
export function parseParserOptions(parserOptions: ParserOptions): Required<ParserOptions> {
	return {
		useBigInt: parserOptions.useBigInt ?? false,
		postprocessors: parserOptions.postprocessors ?? [],
		allowUnexpectedVersionString: parserOptions.allowUnexpectedVersionString ?? false
	};
}

// type validation:

export const struct_ParserOptions: Describe<ParserOptions> = ss.object({
	useBigInt: ss.optional(ss.boolean()),
	postprocessors: ss.optional(ssx.readonlyArray(struct_ParserPostprocessorFunction)),
	allowUnexpectedVersionString: ss.optional(ss.boolean())
});
