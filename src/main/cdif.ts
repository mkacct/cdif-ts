// CDIF class: the main entry point of the cDIF API

import {isValue} from "@mkacct/ts-util";
import * as ss from "superstruct";
import {CDIFDirectiveError} from "./errors.js";
import {extractCdifMajorVersion} from "./general.js";
import runParser, {ParserOptions, struct_ParserOptions} from "./parser/parser.js";
import CDIFPrimitiveValue, {createPrimVal} from "./primitive-value.js";
import {FileOptions, struct_FileOptions} from "./serializer/file-formatter.js";
import runSerializer, {SerializerOptions, struct_SerializerOptions} from "./serializer/serializer.js";
import * as symbol from "./symbol.js";

/** Latest cDIF major version known to this implementation */
const CDIF_LATEST: number = 1;

/**
 * Provides functions to parse and serialize cDIF data.
 */
export default class CDIF { // The package's default export (exported as default by main.ts)

	/** "Protocol" symbols used by the cDIF API */
	public static readonly Symbol = {...symbol} as const;

	/** When returned from a pre/postprocessor function, denotes that the property should be omitted */
	public static readonly OMIT_PROPERTY: unique symbol = Symbol("omitProperty");

	readonly #cdifVersion: number;

	/**
	 * Creates an instance of the cDIF parser/serializer.
	 * @param cdifVersion integer major version of cDIF to use (defaults to latest)
	 * @throws {RangeError} if `cdifVersion` is invalid
	 */
	public constructor(cdifVersion?: number) {
		if (!ss.is(cdifVersion, ss.optional(ss.number()))) {throw new TypeError(`cdifVersion must be a number`);}

		this.#cdifVersion = parseCdifVersion(cdifVersion);
	}

	/**
	 * Converts a cDIF string to a JS value.
	 * @param cdifText a valid cDIF string (read from a file or otherwise)
	 * @param parserOptions customize the behavior of the parser
	 * @returns `cdifText` converted to a JS value (usually an object or array)
	 * @throws {CDIFError} if a postprocessor function tries to omit the root value
	 * @throws {CDIFSyntaxError} if the input has invalid syntax
	 * @throws {CDIFDirectiveError} if an unknown directive is encountered, or a directive is used incorrectly
	 * @throws {CDIFDirectiveError} if `allowUnexpectedVersionString` is false and the "cDIF" directive is used with an unexpected version string
	 * @throws {CDIFReferenceError} if a component reference is not defined
	 * @throws {CDIFReferenceError} if a circular component reference is encountered
	 * @throws {CDIFTypeError} if a spread expression is used with a component of the wrong type
	 */
	public parse(cdifText: string, parserOptions?: ParserOptions): unknown {
		if (!ss.is(cdifText, ss.string())) {throw new TypeError(`cdifText must be a string`);}
		if (!ss.is(parserOptions, ss.optional(struct_ParserOptions))) {
			throw new TypeError(`parserOptions must be a valid ParserOptions object`);
		}

		return runParser(cdifText, this.#cdifVersion, parserOptions ?? {});
	}

	/**
	 * Converts a JS value to a cDIF data string.
	 * @param value a JS value (usually an object or array) to be converted
	 * @param serializerOptions customize the behavior of the serializer
	 * @returns `value` converted to a cDIF data string
	 * @throws {CDIFError} if any value is a `CDIFPrimitiveValue` created with the wrong cDIF version
	 * @throws {CDIFError} if a preprocessor function tries to omit the root value, or, in strict mode, a collection value
	 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
	 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
	 * @throws {CDIFTypeError} if a circular reference is encountered
	 * @throws {CDIFTypeError} in strict mode, if any value is of a disallowed type
	 */
	public serialize(value: unknown, serializerOptions?: SerializerOptions): string {
		if (!ss.is(serializerOptions, ss.optional(struct_SerializerOptions))) {
			throw new TypeError(`serializerOptions must be a valid SerializerOptions object`);
		}

		return runSerializer(value, this.#cdifVersion, serializerOptions ?? {});
	}

	/**
	 * Converts a JS value to a cDIF file string (suitable for writing to a file).
	 * @param value a JS value (usually an object or array) to be converted
	 * @param serializerOptions customize the behavior of the serializer
	 * @param fileOptions customize the behavior of the file formatter
	 * @returns `value` converted to a cDIF file string
	 * @throws {Error} if `fileOptions` is invalid
	 * @throws {CDIFError} if any value is a `CDIFPrimitiveValue` created with the wrong cDIF version
	 * @throws {CDIFError} if a preprocessor function tries to omit the root value, or, in strict mode, a collection value
	 * @throws {CDIFSyntaxError} if an object property name is not a valid cDIF name
	 * @throws {CDIFSyntaxError} if a preprocessor function returns a type name that is not a valid cDIF type name
	 * @throws {CDIFTypeError} if a circular reference is encountered
	 * @throws {CDIFTypeError} in strict mode, if any value is of a disallowed type
	 */
	public serializeFile(value: unknown, serializerOptions?: SerializerOptions, fileOptions?: FileOptions): string {
		if (!ss.is(serializerOptions, ss.optional(struct_SerializerOptions))) {
			throw new TypeError(`serializerOptions must be a valid SerializerOptions object`);
		}
		if (!ss.is(fileOptions, ss.optional(struct_FileOptions))) {
			throw new TypeError(`fileOptions must be a valid FileOptions object`);
		}

		return runSerializer(value, this.#cdifVersion, serializerOptions ?? {}, fileOptions ?? {});
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

function parseCdifVersion(cdifVersion?: number) : number {
	if (!isValue(cdifVersion)) {return CDIF_LATEST;}
	if (((cdifVersion % 1) !== 0) || (cdifVersion < 0)) {
		throw new RangeError(`cdifVersion must be a positive integer`);
	}
	if (cdifVersion > CDIF_LATEST) {throw new RangeError(`cDIF version ${cdifVersion} is not known`);}
	return cdifVersion;
}
