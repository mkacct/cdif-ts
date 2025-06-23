import {isValue} from "@mkacct/ts-util";
import {CDIFError} from "./errors.js";
import {CDIFValue} from "./general.js";
import {CDIFOptions, parseOptions, SerializerOptions} from "./options.js";
import CDIFPrimitiveValue, {createPrimVal} from "./primitive-value.js";
import {encodeCdifValue} from "./serializer/encoder.js";
import {FileOptions, formatCdifFile} from "./serializer/file-formatter.js";

/** Latest cDIF major version known to this implementation */
export const CDIF_LATEST: number = 1;

/**
 * Provides functions to parse and serialize cDIF data.
 */
export default class CDIF {

	/** When returned from a serializer preprocessor function, denotes that the property should be omitted from serialization */
	public static readonly SERIALIZER_OMIT_PROPERTY: unique symbol = Symbol("serializerOmitProperty");

	private readonly cdifVersion: number;
	private readonly serializerOptions: Required<SerializerOptions>;

	/**
	 * Create an instance of the cDIF parser/serializer.
	 * @param options customize the behavior of the parser and/or serializer
	 */
	public constructor(options?: CDIFOptions) {
		const parsedOptions = parseOptions(options);
		this.cdifVersion = parsedOptions.cdifVersion;
		this.serializerOptions = parsedOptions.serializer;
	}

	public parse(cdifText: string): unknown {
		throw new Error("NYI");
	}

	/**
	 * Converts a JS value to a cDIF data string.
	 * @param value a JS value (usually an object or array) to be converted
	 * @returns `value` converted to a cDIF data string
	 */
	public serialize(value: unknown): string {
		const encodedValue: CDIFValue | undefined = encodeCdifValue(null, value, this.serializerOptions, this.cdifVersion);
		if (!isValue(encodedValue)) {throw new CDIFError("root value was omitted");}
		// TODO: return cdif text
	}

	/**
	 * Converts a JS value to a cDIF file string (suitable for writing to a file).
	 * @param value a JS value (usually an object or array) to be converted
	 * @param options customize the behavior of the file formatter
	 * @returns `value` converted to a cDIF file string
	 * @note if `options` is not set, behavior is equivalent to `serialize()`
	 */
	public serializeFile(value: unknown, options?: FileOptions) {
		return formatCdifFile(this.serialize(value), options, this.cdifVersion);
	}

	/**
	 * @param cdifText valid cDIF text representing a primitive value
	 * @returns a cDIF primitive value object representation of the primitive value
	 */
	public createPrimitiveValue(cdifText: string): CDIFPrimitiveValue {
		return createPrimVal(cdifText, this.cdifVersion);
	}

}
