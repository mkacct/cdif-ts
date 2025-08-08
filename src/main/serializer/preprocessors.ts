// Included serializer preprocessor functions you may find convenient

import * as ss from "superstruct";
import CDIF from "../cdif.js";
import * as ssx from "../extensions/ss-util.js";
import {isObject} from "../general.js";
import {SerializerPreprocessorFunction} from "./encoder.js";

/**
 * Serializer preprocessor that omits all properties in an object (and any nested objects) other than those specified.
 * @param names object properties to include
 * @returns the preprocessor function
 * @note does not affect arrays
 */
export function filterObjectProperties(names: ReadonlyArray<string>): SerializerPreprocessorFunction {
	if (!ss.is(names, ssx.readonlyArray(ss.string()))) {throw new TypeError(`names must be an array of strings`);}
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
 * Serializer preprocessor that assigns a certain type to an object if the given condition is met.
 * The actual object value is unchanged.
 * (If the condition is not met, it continues to the next preprocessor as usual.)
 * @param type the type identifier to assign
 * @param condition a function that takes `{key, value}` and returns `true` iff `value` should be assigned type `type`
 * @returns the preprocessor function
 */
export function assignType(
	type: string,
	condition: (data: {
		key: null | string | number;
		value: object;
	}) => boolean
): SerializerPreprocessorFunction {
	if (!ss.is(type, ss.string())) {throw new TypeError(`type must be a string`);}
	if (!ss.is(condition, ssx.defineFunc("condition", 1))) {throw new TypeError(`condition must be a 1-argument function`);}
	return ({key, value}) => {
		if (isObject(value) && condition({key, value})) {
			return {type, value};
		}
	};
}

/**
 * Serializer preprocessor that delegates to the `[CDIF.Symbol.preprocess]` method of an object
 * if it exists. (If not, it continues to the next preprocessor as usual.)
 * @returns the preprocessor function
 */
export function usePreprocessMethods(): SerializerPreprocessorFunction {
	return ({key, value}) => {
		if (isObject(value) && hasCdifPreprocess(value)) {
			const cdifPreprocess: unknown = value[CDIF.Symbol.preprocess];
			if ((typeof cdifPreprocess === "function") && (cdifPreprocess.length <= 1)) {
				return (cdifPreprocess as SerializerPreprocessorFunction)({key, value});
			}
			throw new TypeError(
				`[CDIF.Symbol.preprocess] of object with property name "${key}" is not a valid preprocessor function`
			);
		}
	};
}

function hasCdifPreprocess(value: object): value is {[CDIF.Symbol.preprocess]: unknown} {
	return CDIF.Symbol.preprocess in value;
}
