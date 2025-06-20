import {CDIFOptions, parseOptions} from "./options.js";
import CDIFPrimitiveValue, {createPrimVal} from "./primitive-value.js";

export const CDIF_LATEST: number = 1;

/**
 * Provides functions to parse and serialize cDIF data.
 */
export default class CDIF {

	private readonly cdifVersion: number;
	private readonly isStrictMode: boolean;

	public constructor(options?: CDIFOptions) {
		const parsedOptions = parseOptions(options);
		this.cdifVersion = parsedOptions.cdifVersion;
		this.isStrictMode = parsedOptions.strict;
	}

	public parse(cdifText: string): unknown {
		throw new Error("NYI");
	}

	public serialize(value: unknown): string {
		throw new Error("NYI");
	}

	/**
	 * @param cdifText valid cDIF text representing a primitive value
	 * @returns a cDIF primitive value object representation of the primitive value
	 */
	public createPrimitiveValue(cdifText: string): CDIFPrimitiveValue {
		return createPrimVal(cdifText, this.cdifVersion);
	}

}
