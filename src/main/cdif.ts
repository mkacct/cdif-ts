// CDIF class: the main entry point of the cDIF API

import * as ss from "superstruct";
import {CDIFDirectiveError, CDIFError} from "./errors.js";
import {CDIFValue, extractCdifMajorVersion} from "./general.js";
import {CDIFOptions, parseOptions, ParserOptions, SerializerOptions, struct_CDIFOptions} from "./options.js";
import decodeCdifValue from "./parser/decoder.js";
import parseCdifTokens from "./parser/proper/parser.js";
import tokenizeCdifFile, {Token} from "./parser/tokenizer.js";
import CDIFPrimitiveValue, {createPrimVal} from "./primitive-value.js";
import encodeCdifValue from "./serializer/encoder.js";
import formatCdifFile, {FileOptions, struct_FileOptions} from "./serializer/file-formatter.js";
import stringifyCdifValue from "./serializer/stringifier.js";
import * as symbol from "./symbol.js";

/** Latest cDIF major version known to this implementation */
export const CDIF_LATEST: number = 1;

/**
 * Provides functions to parse and serialize cDIF data.
 */
export default class CDIF { // The package's default export (exported as default by main.ts)

	/** "Protocol" symbols used by the cDIF API */
	public static readonly Symbol = {...symbol} as const;

	/** When returned from a pre/postprocessor function, denotes that the property should be omitted */
	public static readonly OMIT_PROPERTY: unique symbol = Symbol("omitProperty");

	readonly #cdifVersion: number;
	readonly #parserOptions: Required<ParserOptions>;
	readonly #serializerOptions: Required<SerializerOptions>;

	/**
	 * Create an instance of the cDIF parser/serializer.
	 * @param options customize the behavior of the parser and/or serializer
	 * @throws {Error} if `options` is invalid
	 */
	public constructor(options?: CDIFOptions) {
		if (!ss.is(options, ss.optional(struct_CDIFOptions))) {
			throw new TypeError(`options must be a valid CDIFOptions object`);
		}
		const parsedOptions = parseOptions(options);
		this.#cdifVersion = parsedOptions.cdifVersion;
		this.#parserOptions = parsedOptions.parser;
		this.#serializerOptions = parsedOptions.serializer;
	}

	/**
	 * Converts a cDIF string to a JS value.
	 * @param cdifText a valid cDIF string (read from a file or otherwise)
	 * @returns `cdifText` converted to a JS value (usually an object or array)
	 * @throws {CDIFError} if a postprocessor function tries to omit the root value
	 * @throws {CDIFSyntaxError} if the input has invalid syntax
	 * @throws {CDIFDirectiveError} if an unknown directive is encountered, or a directive is used incorrectly
	 * @throws {CDIFDirectiveError} if `allowUnexpectedVersionString` is false and the "cDIF" directive is used with an unexpected version string
	 * @throws {CDIFReferenceError} if a component reference is not defined
	 * @throws {CDIFReferenceError} if a circular component reference is encountered
	 * @throws {CDIFTypeError} if a spread expression is used with a component of the wrong type
	 */
	public parse(cdifText: string): unknown {
		if (!ss.is(cdifText, ss.string())) {throw new TypeError(`cdifText must be a string`);}
		return this.#parseImpl(cdifText);
	}

	#parseImpl(cdifText: string): unknown {
		const tokens: Token[] = tokenizeCdifFile(cdifText);
		const parsedCdifValue: CDIFValue = parseCdifTokens(tokens, this.#parserOptions, this.#cdifVersion);
		const res: {value: unknown} | undefined = decodeCdifValue(
			null, parsedCdifValue, this.#parserOptions, this.#cdifVersion
		);
		if (!res) {throw new CDIFError(`Root value was omitted`);}
		return res.value;
	}

	/**
	 * Converts a JS value to a cDIF data string.
	 * @param value a JS value (usually an object or array) to be converted
	 * @returns `value` converted to a cDIF data string
	 * @throws {CDIFError} if any value is a `CDIFPrimitiveValue` created with the wrong cDIF version
	 * @throws {CDIFError} if a preprocessor function tries to omit the root value, or, in strict mode, a collection value
	 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
	 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
	 * @throws {CDIFTypeError} if a circular reference is encountered
	 * @throws {CDIFTypeError} in strict mode, if any value is of a disallowed type
	 */
	public serialize(value: unknown): string {
		return this.#serializeImpl(value);
	}

	/**
	 * Converts a JS value to a cDIF file string (suitable for writing to a file).
	 * @param value a JS value (usually an object or array) to be converted
	 * @param options customize the behavior of the file formatter
	 * @returns `value` converted to a cDIF file string
	 * @note if `options` is not set, behavior is equivalent to `serialize()`
	 * @throws {Error} if `options` is invalid
	 * @throws {CDIFError} if any value is a `CDIFPrimitiveValue` created with the wrong cDIF version
	 * @throws {CDIFError} if a preprocessor function tries to omit the root value, or, in strict mode, a collection value
	 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
	 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
	 * @throws {CDIFTypeError} if a circular reference is encountered
	 * @throws {CDIFTypeError} in strict mode, if any value is of a disallowed type
	 */
	public serializeFile(value: unknown, options?: FileOptions): string {
		if (!ss.is(options, ss.optional(struct_FileOptions))) {
			throw new TypeError(`options must be a valid FileOptions object`);
		}
		return this.#serializeImpl(value, options ?? {});
	}

	#serializeImpl(value: unknown, fileOptions?: FileOptions) {
		const encodedValue: CDIFValue | undefined = encodeCdifValue(
			null, value, this.#serializerOptions, this.#cdifVersion
		);
		if (!encodedValue) {throw new CDIFError(`Root value was omitted`);}
		const cdifText: string = stringifyCdifValue(encodedValue, this.#serializerOptions);
		return fileOptions ? formatCdifFile(cdifText, fileOptions, this.#cdifVersion) : cdifText;
	}

	/**
	 * @param cdifText valid cDIF text representing a primitive value
	 * @returns a cDIF primitive value object representation of the primitive value
	 * @throws {CDIFSyntaxError} if `cdifText` is not a valid cDIF primitive value
	 */
	public createPrimitiveValue(cdifText: string): CDIFPrimitiveValue {
		if (!ss.is(cdifText, ss.string())) {throw new TypeError(`cdifText must be a string`);}
		return createPrimVal(cdifText, this.#cdifVersion);
	}

	/**
	 * @param cdifText a valid cDIF string (read from a file or otherwise)
	 * @returns the cDIF major version, or `undefined` if no "cDIF" directive is present
	 * @throws {CDIFDirectiveError} if an initial "cDIF" directive is present but has an invalid version string
	 */
	public static getCdifVersion(cdifText: string): number | undefined {
		if (!ss.is(cdifText, ss.string())) {throw new TypeError(`cdifText must be a string`);}
		const match = cdifText.split("\n", 1)[0].trimEnd().match(/^#\s*cDIF\s*(.*)$/us);
		if (!match) {return undefined;}
		try {
			return extractCdifMajorVersion(match[1]);
		} catch (err) {
			if (err instanceof RangeError) {
				throw new CDIFDirectiveError(err.message);
			} else {throw err;}
		}
	}

}
