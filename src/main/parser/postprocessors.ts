// Included parser postprocessor functions you may find convenient

import * as ss from "superstruct";

import {ParserPostprocessorFunction, struct_ParserPostprocessorFunction} from "./decoder.js";

/**
 * Parser postprocessor that applies the given postprocessor function if the parsed value has the given type name.
 * @param type the type identifier to postprocess
 * @param fn the postprocessor function to apply if the type matches
 * @returns the postprocessor function
 */
export function postprocessType(
	type: string,
	fn: (data: Parameters<ParserPostprocessorFunction>[0] & {type: string}) => ReturnType<ParserPostprocessorFunction>
): ParserPostprocessorFunction {
	if (!ss.is(type, ss.string())) {throw new TypeError(`type must be a string`);}
	if (!ss.is(fn, struct_ParserPostprocessorFunction)) {
		throw new TypeError(`fn must be a ParserPostprocessorFunction`);
	}

	return ({key, type: actualType, value}) => {
		if (actualType === type) {
			return fn({key, type: actualType, value});
		}
	};
}
