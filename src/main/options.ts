import {isValue} from "@mkacct/ts-util";
import {CDIF_LATEST} from "./cdif.js";
import {SerializerPreprocessorFunction} from "./encoder.js";

export interface CDIFOptions {
	/** Integer major version of cDIF to use (defaults to latest) */
	cdifVersion?: number;
	// /** Options pertaining to the parser */
	// parser?: ParserOptions;
	/** Options pertaining to the serializer */
	serializer?: SerializerOptions;
}

// interface ParserOptions {

// }

export interface SerializerOptions {
	/**
	 * In strict mode, the serializer will throw an error if a value cannot be serialized;
	 * in non-strict mode, the value will be omitted or replaced with null
	 * (defaults to `true`; see docs for details)
	 */
	strict?: boolean;
	/**
	 * Array of functions (in order of precedence) called for each value before serialization,
	 * used to customize behavior and/or add type names
	 * (see docs for details)
	 */
	preprocessors?: readonly SerializerPreprocessorFunction[];
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
	return {
		cdifVersion: parseCdifVersion(options.cdifVersion),
		// parser: {},
		serializer: {
			strict: options.serializer?.strict ?? true,
			preprocessors: options.serializer?.preprocessors ?? []
		}
	};
}

function parseCdifVersion(cdifVersion?: number) : number {
	if (!isValue(cdifVersion)) {return CDIF_LATEST;}
	if (((cdifVersion % 1) !== 0) || (cdifVersion < 0)) {throw new RangeError("cdifVersion must be a positive integer");}
	if (cdifVersion > CDIF_LATEST) {throw new RangeError(`cDIF version ${cdifVersion} is not known`);}
	return cdifVersion;
}
