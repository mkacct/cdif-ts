import {isValue} from "@mkacct/ts-util";
import {CDIF_LATEST} from "./cdif.js";

export interface CDIFOptions {
	cdifVersion?: number;
	strict?: boolean;
}

export function parseOptions(options?: CDIFOptions) {
	options = options ?? {};
	return {
		cdifVersion: parseCdifVersion(options.cdifVersion),
		strict: options.strict ?? false
	};
}

function parseCdifVersion(cdifVersion?: number) : number {
	if (!isValue(cdifVersion)) {return CDIF_LATEST;}
	if (((cdifVersion % 1) !== 0) || (cdifVersion < 0)) {throw new RangeError("cdifVersion must be a positive integer");}
	if (cdifVersion > CDIF_LATEST) {throw new RangeError(`cDIF version ${cdifVersion} is not known`);}
	return cdifVersion;
}
