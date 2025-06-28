// Utilities extending Superstruct

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as ss from "superstruct";
import {Describe, Infer, Struct} from "superstruct";

/**
 * Wraps Superstruct's `define()`, defining a struct type for a function with a given argument count.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function ss_defineFunc<T extends Function>(name: string, length: number): Struct<T, null> {
	return ss.define<T>(name, (value: unknown): value is T => {
		return (typeof value === "function") && (value.length === length);
	});
}

/**
 * Wraps Superstruct's `array()` but forces it to accept that the array should be treated as a TS `ReadonlyArray`.
 */
export function ss_readonlyArray<T extends Struct<any>>(element: T): Describe<ReadonlyArray<Infer<T>>>;
export function ss_readonlyArray(): Describe<ReadonlyArray<unknown>>;
export function ss_readonlyArray<T extends Struct<any>>(element?: T): any {
	return element ? ss.array(element) : ss.array();
}
