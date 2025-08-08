// Utilities extending Superstruct

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as ss from "superstruct";
import {Describe, Infer, Struct} from "superstruct";
import {isObject} from "../general.js";

/**
 * Ensure that a value is an `object` as defined by TS (not `null`; arrays allowed).
 * @note this is not the same behavior as Superstruct's `object()`
 */
export function tsObject(): Struct<object, null> {
	return ss.define<object>("object", isObject);
}

/**
 * Wraps Superstruct's `define()`, defining a struct type for a function with a given maximum argument count.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function defineFunc<T extends Function>(name: string, length: number): Struct<T, null> {
	return ss.define<T>(name, (value: unknown): value is T => {
		return (typeof value === "function") && (value.length <= length);
	});
}

/**
 * Wraps Superstruct's `array()` but forces it to accept that the array should be treated as a TS `ReadonlyArray`.
 */
export function readonlyArray<T extends Struct<any>>(element: T): Describe<ReadonlyArray<Infer<T>>>;
export function readonlyArray(): Describe<ReadonlyArray<unknown>>;
export function readonlyArray<T extends Struct<any>>(element?: T): any {
	return element ? ss.array(element) : ss.array();
}
