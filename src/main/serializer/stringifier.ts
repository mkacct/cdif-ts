import {CDIFValue} from "../general.js";
import {SerializerOptions} from "../options.js";

/**
 * @note this doesn't validate the cDIF version of any `CDIFPrimitiveValue`s in `value`; the encoder should've done that already
 */
export function stringifyCdifValue(value: CDIFValue, options: Required<SerializerOptions>): string {
	// TODO
}
