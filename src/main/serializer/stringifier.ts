// Stringifier: a component of the serializer used to convert CDIFValue objects to cDIF data strings

import {isValue} from "@mkacct/ts-util";
import {CDIFValue} from "../general.js";
import CDIFPrimitiveValue from "../primitive-value.js";
import {SerializerOptions} from "./serializer.js";

/**
 * @param value
 * @param options
 * @returns `value` as cDIF text
 * @note this doesn't validate the cDIF version of any `CDIFPrimitiveValue`s in `value`; the encoder should've done that already
 */
export default function stringifyCdifValue(value: CDIFValue, options: Required<SerializerOptions>): string {
	let writer: OutputTextWriter;
	if (options.minify) {
		writer = new OutputTextWriter(options);
	} else if (isValue(options.indent)) {
		writer = new MultilineOutputTextWriter(options);
	} else {
		writer = new OneLineOutputTextWriter(options);
	}
	writeCdifValueText(writer, value);
	return writer.text;
}

export function writeCdifValueText(writer: OutputTextWriter, value: CDIFValue): void {
	if (value instanceof CDIFPrimitiveValue) {
		writer.write(value.cdifText);
	} else { // value instanceof CDIFStructure
		value.writeCdifText(writer);
	}
}

/**
 * Used to generate code output with specific formatting options.
 */
export class OutputTextWriter { // base OutputTextWriter works for minified output

	readonly #options: Required<SerializerOptions>;

	readonly #strs: string[] = [];

	public constructor(options: Required<SerializerOptions>) {
		this.#options = options;
	}

	/** The string built by this writer */
	public get text(): string {return this.#strs.join("");}

	/**
	 * Append text to the resultant string.
	 * @param text
	 */
	public write(text: string) {
		this.#strs.push(text);
		this.afterWrite();
	}

	protected afterWrite(): void {}

	protected undoLastWrite(): void {
		this.#strs.pop();
	}

	/** Insert the appropriate whitespace. */
	public space(): void {}

	/**
	 * Append opening bracket and appropriate whitespace.
	 * @param bracket the opening bracket
	 * @note if structure is empty, don't use these, just write brackets directly
	 */
	public openStructure(bracket: string): void {
		this.write(bracket);
		this.afterOpeningBracket();
	}

	/**
	 * Append appropriate whitespace and closing bracket.
	 * @param bracket the closing bracket
	 * @note if structure is empty, don't use these, just write brackets directly
	 */
	public closeStructure(bracket: string): void {
		this.beforeClosingBracket();
		this.write(bracket);
	}

	protected afterOpeningBracket(): void {}
	protected beforeClosingBracket(): void {}

	/**
	 * Append the separator and appropriate whitespace after a structure entry.
	 * @param isLast whether this is the last entry of the structure
	 */
	public endStructureEntry(isLast: boolean): void {
		if (!isLast || this.#options.addFinalStructureEntrySeparator) {
			this.write(this.#options.structureEntrySeparator);
		}
		this.afterStructureEntry(isLast);
	}

	protected afterStructureEntry(_isLast: boolean): void {}

}

class OneLineOutputTextWriter extends OutputTextWriter {

	public override space(): void {
		this.write(" ");
	}

	protected override afterStructureEntry(isLast: boolean): void {
		if (!isLast) {
			this.space();
		}
	}

}

class MultilineOutputTextWriter extends OutputTextWriter {

	readonly #indent: string;

	#indentLevel: number = 0;
	#didJustIndent: boolean = false;

	public constructor(options: Required<SerializerOptions>) {
		super(options);
		this.#indent = options.indent ?? "";
	}

	protected override afterWrite(): void {
		this.#didJustIndent = false;
	}

	public override space(): void {
		this.write(" ");
	}

	protected override afterOpeningBracket(): void {
		this.#indentLevel++;
		this.newLine();
	}

	protected override beforeClosingBracket(): void {
		if (this.#didJustIndent) {this.undoLastWrite();}
		this.#indentLevel--;
	}

	protected override afterStructureEntry(_isLast: boolean): void {
		this.newLine();
	}

	private newLine(): void {
		this.write("\n");
		if (this.#indentLevel > 0) {
			for (let i: number = 0; i < this.#indentLevel; i++) {
				this.write(this.#indent);
			}
			this.#didJustIndent = true;
		}
	}

}
