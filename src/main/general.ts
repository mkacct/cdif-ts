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

/**
 * @param cdifVersionString
 * @returns the major version number from the given version string
 * @throws {RangeError} if `cdifVersionString` is not a valid cDIF version string
 */
export function extractCdifMajorVersion(cdifVersionString: string): number {
	const match = cdifVersionString.match(/^(?<major>0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))*$/s);
	if (!match) {
		throw new RangeError(`Invalid cDIF version string "${cdifVersionString}"`);
	}
	return parseInt(match.groups!.major);
}

/**
 * @param cdifVersionString
 * @param cdifVersion
 * @throws {Error} if `cdifVersionString`'s major version does not match `cdifVersion`
 * @throws {RangeError} if `cdifVersionString` is not a valid cDIF version string
 */
export function validateCdifVersionString(cdifVersionString: string, cdifVersion: number): void {
	const major: number = extractCdifMajorVersion(cdifVersionString);
	if (major !== cdifVersion) {
		throw new Error(`cDIF version string mismatch (expected ${cdifVersion}, got ${major})`);
	}
}
