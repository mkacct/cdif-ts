// Types and functions for parsing cDIF options,
// used when instantiating the CDIF class to configure the behavior of the parser and serializer

import {isValue} from "@mkacct/ts-util";
import * as ss from "superstruct";
import {Describe} from "superstruct";
import {CDIF_LATEST} from "./cdif.js";
import {ss_readonlyArray} from "./extensions/ss-util.js";
import {ParserPostprocessorFunction, struct_ParserPostprocessorFunction} from "./parser/decoder.js";
import {SerializerPreprocessorFunction, struct_SerializerPreprocessorFunction} from "./serializer/encoder.js";

export interface CDIFOptions {
	/** Integer major version of cDIF to use (defaults to latest) */
	readonly cdifVersion?: number;
	/** Options pertaining to the parser */
	readonly parser?: ParserOptions;
	/** Options pertaining to the serializer */
	readonly serializer?: SerializerOptions;
}

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
 * @param options
 * @returns `options` with certain values normalized and defaults applied
 * @throws {RangeError} if `cdifVersion` is invalid
 */
export function parseOptions(options?: CDIFOptions): { // return type is basically deep required CDIFOptions
	cdifVersion: number;
	parser: Required<ParserOptions>;
	serializer: Required<SerializerOptions>;
} {
	options = options ?? {};
	return {
		cdifVersion: parseCdifVersion(options.cdifVersion),
		parser: parseParserOptions(options.parser),
		serializer: parseSerializerOptions(options.serializer)
	};
}

function parseCdifVersion(cdifVersion?: number) : number {
	if (!isValue(cdifVersion)) {return CDIF_LATEST;}
	if (((cdifVersion % 1) !== 0) || (cdifVersion < 0)) {
		throw new RangeError(`cdifVersion must be a positive integer`);
	}
	if (cdifVersion > CDIF_LATEST) {throw new RangeError(`cDIF version ${cdifVersion} is not known`);}
	return cdifVersion;
}

export function parseParserOptions(parserOptions?: ParserOptions): Required<ParserOptions> {
	parserOptions = parserOptions ?? {};
	return {
		useBigInt: parserOptions.useBigInt ?? false,
		postprocessors: parserOptions.postprocessors ?? [],
		allowUnexpectedVersionString: parserOptions.allowUnexpectedVersionString ?? false
	};
}

export function parseSerializerOptions(serializerOptions?: SerializerOptions): Required<SerializerOptions> {
	serializerOptions = serializerOptions ?? {};
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

const struct_SerializerOptions: Describe<SerializerOptions> = ss.object({
	strict: ss.optional(ss.boolean()),
	indent: ss.optional(ss.nullable(ss.string())),
	structureEntrySeparator: ss.optional(ss.enums([",", ";"])),
	addFinalStructureEntrySeparator: ss.optional(ss.boolean()),
	preprocessors: ss.optional(ss_readonlyArray(struct_SerializerPreprocessorFunction))
});

const struct_ParserOptions: Describe<ParserOptions> = ss.object({
	useBigInt: ss.optional(ss.boolean()),
	postprocessors: ss.optional(ss_readonlyArray(struct_ParserPostprocessorFunction)),
	allowUnexpectedVersionString: ss.optional(ss.boolean())
});

export const struct_CDIFOptions: Describe<CDIFOptions> = ss.object({
	cdifVersion: ss.optional(ss.number()),
	parser: ss.optional(struct_ParserOptions),
	serializer: ss.optional(struct_SerializerOptions)
});
