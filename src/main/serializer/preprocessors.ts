// Included serializer preprocessor functions you may find convenient

import * as ss from "superstruct";
import CDIF from "../cdif.js";
import {ss_readonlyArray} from "../extensions/ss-util.js";
import {SerializerPreprocessorFunction} from "./encoder.js";

/**
 * Serializer preprocessor that omits all properties in the object (and any nested objects) other than those specified.
 * @param names object properties to include
 * @returns the preprocessor function
 * @note does not affect arrays
 */
export function filterObjectProperties(names: ReadonlyArray<string>): SerializerPreprocessorFunction {
	if (!ss.is(names, ss_readonlyArray(ss.string()))) {throw new TypeError(`names must be an array of strings`);}
	return ({key}) => {
		if ((typeof key === "string") && !names.includes(key)) {
			return CDIF.OMIT_PROPERTY;
		}
	};
}

/**
 * Serializer preprocessor that makes integer `number`s (evenly divisible by 1) be serialized as cDIF integers.
 * (They won't have trailing decimal points in the resulting cDIF text.)
 * @returns the preprocessor function
 */
export function useIntegers(): SerializerPreprocessorFunction {
	return ({value}) => {
		if (typeof value === "number") {
			if (value % 1 === 0) {
				return {value: BigInt(value)};
			}
		}
	};
}
