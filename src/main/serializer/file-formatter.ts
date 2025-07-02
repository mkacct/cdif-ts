// File formatter: a component of the serializer used to convert cDIF data strings to cDIF file strings
// by adding file formatting (ex. "cDIF" directive header)

import {isValue} from "@mkacct/ts-util";
import * as ss from "superstruct";
import {Describe} from "superstruct";

export interface FileOptions {
	/**
	 * Whether to prepend the "cDIF" directive at the start of the file
	 * (defaults to `true` iff `cdifVersionString` is provided)
	 */
	readonly addHeader?: boolean;
	/**
	 * cDIF version string to use in the "cDIF" directive
	 * (required if `addHeader` is `true`)
	 */
	readonly cdifVersionString?: string;
	/**
	 * Whether to append a semicolon at the end of the data value
	 * (defaults to `false`)
	 */
	readonly addFinalSemicolon?: boolean;
	/**
	 * If `true`, `cdifVersionString` will not be validated;
	 * if `false`, an error will be thrown if `cdifVersionString` is invalid or does not match the cDIF version
	 * (defaults to `false`)
	 */
	readonly allowUnexpectedVersionString?: boolean;
}

/**
 * @param cdifText cDIF data string returned by `CDIF.serialize()`
 * @param options
 * @param cdifVersion
 * @returns cDIF file string (suitable for writing to a file)
 * @throws {Error} if `options` is invalid
 */
export function formatCdifFile(cdifText: string, options: FileOptions, cdifVersion: number): string {
	const parsedOptions = parseFileOptions(options, cdifVersion);
	return (
		(parsedOptions.headerData ? `# cDIF ${parsedOptions.headerData.cdifVersionString}\n` : "")
		+ cdifText
		+ (parsedOptions.addFinalSemicolon ? ";" : "")
	);
}

function parseFileOptions(options: FileOptions, cdifVersion: number) {
	const addHeader: boolean = options.addHeader ?? (isValue(options.cdifVersionString));
	if (isValue(options.cdifVersionString) && !options.allowUnexpectedVersionString) {
		validateCdifVersionString(options.cdifVersionString, cdifVersion);
	}
	let headerData: {cdifVersionString: string} | null = null;
	if (addHeader) {
		if (!isValue(options.cdifVersionString)) {
			throw new Error(`If addHeader is true, cdifVersionString must be supplied`);
		}
		headerData = {cdifVersionString: options.cdifVersionString};
	}
	return {
		headerData: headerData,
		addFinalSemicolon: options.addFinalSemicolon ?? false
	};
}

function validateCdifVersionString(cdifVersionString: string, cdifVersion: number): void {
	const match = cdifVersionString.match(/^(?<major>0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))*$/s);
	if (!match) {
		throw new RangeError(`Invalid cDIF version string "${cdifVersionString}"`);
	}
	const major: number = parseInt(match.groups!.major);
	if (major !== cdifVersion) {
		throw new Error(`cDIF file formatter version mismatch (expected ${cdifVersion}, got ${major})`);
	}
}

// type validation:

export const struct_FileOptions: Describe<FileOptions> = ss.object({
	addHeader: ss.optional(ss.boolean()),
	cdifVersionString: ss.optional(ss.string()),
	addFinalSemicolon: ss.optional(ss.boolean()),
	allowUnexpectedVersionString: ss.optional(ss.boolean())
});
