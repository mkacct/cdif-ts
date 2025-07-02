// Used in various places across the codebase

import CDIFPrimitiveValue from "./primitive-value.js";
import CDIFStructure from "./structure.js";

/** A cDIF value, which can be either a primitive value or a structure. */
export type CDIFValue = CDIFPrimitiveValue | CDIFStructure;

/**
 * @returns true iff `value` is a TS `object` (not null)
 * @note returns true for arrays
 */
export function isObject(value: unknown): value is object {
	return (typeof value === "object") && (value !== null);
}
