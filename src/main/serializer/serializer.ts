// Main file for the serializer

import * as ss from "superstruct";
import {Describe} from "superstruct";
import {CDIFError} from "../errors.js";
import * as ssx from "../extensions/ss-util.js";
import {CDIFValue} from "../general.js";
import encodeCdifValue, {SerializerPreprocessorFunction, struct_SerializerPreprocessorFunction} from "./encoder.js";
import formatCdifFile, {FileOptions} from "./file-formatter.js";
import stringifyCdifValue from "./stringifier.js";

export interface SerializerOptions {
	/**
	 * In strict mode, the serializer will throw an error if a value cannot be serialized;
	 * in non-strict mode, the value will be omitted or replaced with null
	 * (defaults to `true`; see docs for details)
	 */
	readonly strict?: boolean;
	/**
	 * String to use to indent a level in the serialized cDIF text,
	 * or `null` to output as one line
	 * (defaults to `null`)
	 */
	readonly indent?: string | null;
	/**
	 * Separator between object or collection entries in the serialized cDIF text
	 * (defaults to `","`)
	 */
	readonly structureEntrySeparator?: "," | ";";
	/**
	 * Whether a separator should be added after the last entry in an object or collection
	 * (defaults to `true` iff `structureEntrySeparator` is `";"`)
	 */
	readonly addFinalStructureEntrySeparator?: boolean;
	/**
	 * Array of functions (in order of precedence) called for each value before serialization,
	 * used to customize behavior and/or add type names
	 * (see docs for details)
	 */
	readonly preprocessors?: ReadonlyArray<SerializerPreprocessorFunction>;
}

/**
 * Converts a JS value to a cDIF string.
 * If `fileOptions` is supplied, it will return a cDIF file string (suitable for writing to a file),
 * otherwise it will return a simple cDIF data string.
 * @param value a JS value (usually an object or array) to be converted
 * @param cdifVersion integer major version of the cDIF specification
 * @param serializerOptions customize the behavior of the serializer
 * @param fileOptions customize the behavior of the file formatter (if not supplied, skip the file formatter)
 * @returns `value` converted to a cDIF string
 * @throws {Error} if `fileOptions` is supplied but invalid
 * @throws {CDIFError} if any value is a `CDIFPrimitiveValue` created with the wrong cDIF version
 * @throws {CDIFError} if a preprocessor function tries to omit the root value, or, in strict mode, a collection value
 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
 * @throws {CDIFTypeError} if a circular reference is encountered
 * @throws {CDIFTypeError} in strict mode, if any value is of a disallowed type
 */
export default function runSerializer(
	value: unknown, cdifVersion: number, serializerOptions: SerializerOptions, fileOptions?: FileOptions
): string {
	const reqOptions: Required<SerializerOptions> = parseSerializerOptions(serializerOptions);
	const encodedValue: CDIFValue | undefined = encodeCdifValue(
		null, value, reqOptions, cdifVersion
	);
	if (!encodedValue) {throw new CDIFError(`Root value was omitted`);}
	const cdifText: string = stringifyCdifValue(encodedValue, reqOptions);
	return fileOptions ? formatCdifFile(cdifText, fileOptions, cdifVersion) : cdifText;
}

/**
 * @param serializerOptions
 * @returns `serializerOptions` with defaults applied
 */
export function parseSerializerOptions(serializerOptions: SerializerOptions): Required<SerializerOptions> {
	const structureSep = serializerOptions.structureEntrySeparator ?? ",";
	return {
		strict: serializerOptions.strict ?? true,
		indent: serializerOptions.indent ?? null,
		structureEntrySeparator: structureSep,
		addFinalStructureEntrySeparator: serializerOptions.addFinalStructureEntrySeparator ?? (structureSep === ";"),
		preprocessors: serializerOptions.preprocessors ?? []
	};
}

// type validation:

export const struct_SerializerOptions: Describe<SerializerOptions> = ss.object({
	strict: ss.optional(ss.boolean()),
	indent: ss.optional(ss.nullable(ss.string())),
	structureEntrySeparator: ss.optional(ss.enums([",", ";"])),
	addFinalStructureEntrySeparator: ss.optional(ss.boolean()),
	preprocessors: ss.optional(ssx.readonlyArray(struct_SerializerPreprocessorFunction))
});
