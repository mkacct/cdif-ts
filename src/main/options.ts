import {isValue} from "@mkacct/ts-util";
import {CDIF_LATEST} from "./cdif.js";
import {SerializerPreprocessorFunction} from "./serializer/encoder.js";

export interface CDIFOptions {
	/** Integer major version of cDIF to use (defaults to latest) */
	readonly cdifVersion?: number;
	// /** Options pertaining to the parser */
	// parser?: ParserOptions;
	/** Options pertaining to the serializer */
	readonly serializer?: SerializerOptions;
}

// interface ParserOptions {

// }

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
	 * (defaults to `,`)
	 */
	readonly structureEntrySeparator?: "," | ";";
	/**
	 * Whether a separator should be added after the last entry in an object or collection
	 * (defaults to `true` iff `structureEntrySeparator` is `;`)
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
 */
export function parseOptions(options?: CDIFOptions): { // return type is basically deep required CDIFOptions
	cdifVersion: number;
	// parser: Required<ParserOptions>;
	serializer: Required<SerializerOptions>;
} {
	options = options ?? {};
	const structureSep = options.serializer?.structureEntrySeparator ?? ",";
	return {
		cdifVersion: parseCdifVersion(options.cdifVersion),
		// parser: {},
		serializer: {
			strict: options.serializer?.strict ?? true,
			indent: options.serializer?.indent ?? null,
			structureEntrySeparator: structureSep,
			addFinalStructureEntrySeparator: options.serializer?.addFinalStructureEntrySeparator ?? (structureSep === ";"),
			preprocessors: options.serializer?.preprocessors ?? []
		}
	};
}

function parseCdifVersion(cdifVersion?: number) : number {
	if (!isValue(cdifVersion)) {return CDIF_LATEST;}
	if (((cdifVersion % 1) !== 0) || (cdifVersion < 0)) {throw new RangeError(`cdifVersion must be a positive integer`);}
	if (cdifVersion > CDIF_LATEST) {throw new RangeError(`cDIF version ${cdifVersion} is not known`);}
	return cdifVersion;
}
