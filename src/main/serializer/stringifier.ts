import {isValue} from "@mkacct/ts-util";
import {CDIFValue} from "../general.js";
import {SerializerOptions} from "../options.js";
import CDIFPrimitiveValue from "../primitive-value.js";

/**
 * @param value
 * @param options
 * @returns `value` as cDIF text
 * @note this doesn't validate the cDIF version of any `CDIFPrimitiveValue`s in `value`; the encoder should've done that already
 */
export function stringifyCdifValue(value: CDIFValue, options: Required<SerializerOptions>): string {
	const writer = new PrettyTextWriter(options.indent ?? undefined);
	writeCdifValueText(writer, value, options);
	return writer.text;
}

export function writeCdifValueText(
	writer: PrettyTextWriter, value: CDIFValue, options: Required<SerializerOptions>
): void {
	if (value instanceof CDIFPrimitiveValue) {
		writer.write(value.cdifText);
	} else { // value instanceof CDIFStructure
		value.writeCdifText(writer, options);
	}
}

/**
 * Used to generate code output with specific formatting options.
 */
export class PrettyTextWriter {

	private readonly strs: string[] = [];

	private readonly isMultiline: boolean;
	private readonly indent?: string;

	private indentLevel: number = 0;
	private nextSeparator: string = "";

	public constructor(indent?: string) {
		this.isMultiline = isValue(indent);
		this.indent = indent;
	}

	/** The string built by this writer */
	public get text(): string {return this.strs.join("");}

	/**
	 * Append text to the resultant string.
	 * @param text
	 * @param oneLineSeparator follows `text` if this is a single-line string
	 * @param isEOL whether to follow `text` with a newline if this is a multiline string
	 */
	public write(text: string = "", oneLineSeparator: string = "", isEOL: boolean = false): void {
		if ((this.strs.length > 0) && this.nextSeparator) {
			this.strs.push(this.nextSeparator);
		}
		if (this.isMultiline) {
			if (this.nextSeparator === "\n") {
				this.strs.push(this.indent!.repeat(this.indentLevel));
			}
			this.nextSeparator = isEOL ? "\n" : "";
		} else {
			this.nextSeparator = oneLineSeparator;
		}
		if (text) {
			this.strs.push(text);
		}
	}

	/**
	 * Adjust the text indentation level by the given quantity.
	 */
	public changeIndent(by: number): void {
		this.indentLevel = Math.max(0, this.indentLevel + by);
	}

	/**
	 * Prevent the next write from adding a separator.
	 */
	public clearNextSeparator(): void {
		this.nextSeparator = "";
	}

}
