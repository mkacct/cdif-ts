// Included serializer preprocessor functions you may find convenient

import * as ss from "superstruct";
import CDIF from "../cdif.js";
import {ss_readonlyArray} from "../extensions/ss-util.js";
import {SerializerPreprocessorFunction} from "./encoder.js";
import {isObject} from "../general.js";

export const CDIFPreprocessorsSymbol = {
	/**
	 * A method that will be called as a serializer preprocessor function for an object
	 * when using `usePreprocessMethods()`. (Must be a valid `SerializerPreprocessorFunction`.)
	 * @note the serializer doesn't look for this method by default; you must be using `usePreprocessMethods()`!
	 */
	cdifPreprocess: Symbol("cdifPreprocess")
} as const;

/**
 * Serializer preprocessor that omits all properties in an object (and any nested objects) other than those specified.
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

/**
 * Serializer preprocessor that delegates to the `[CDIFPreprocessorsSymbol.cdifPreprocess]` method of an object
 * if it exists. (If not, it continues to the next preprocessor as usual.)
 * @returns the preprocessor function
 */
export function usePreprocessMethods(): SerializerPreprocessorFunction {
	return ({key, value}) => {
		if (isObject(value) && hasCdifPreprocess(value)) {
			const cdifPreprocess: unknown = value[CDIFPreprocessorsSymbol.cdifPreprocess];
			if ((typeof cdifPreprocess === "function") && (cdifPreprocess.length <= 1)) {
				return (cdifPreprocess as SerializerPreprocessorFunction)({key, value});
			} else {
				throw new TypeError(
					`[CDIFPreprocessorsSymbol.cdifPreprocess] of object with property name "${key}"`
					+ `is not a valid preprocessor function`
				);
			}
		}
	};
}

function hasCdifPreprocess(value: object): value is {[CDIFPreprocessorsSymbol.cdifPreprocess]: unknown} {
	return CDIFPreprocessorsSymbol.cdifPreprocess in value;
}
