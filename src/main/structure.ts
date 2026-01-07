// CDIFStructure and its subclasses, used for representing cDIF collections & objects in the parser & serializer

import {isValue} from "@mkacct/ts-util";
import {CDIFSyntaxError} from "./errors.js";
import {CDIFValue} from "./general.js";
import {isValidName, isValidTypeId} from "./identifiers.js";
import decodeCdifValue from "./parser/decoder.js";
import {ParserOptions} from "./parser/parser.js";
import {OutputTextWriter, writeCdifValueText} from "./serializer/stringifier.js";

/**
 * Either a cDIF collection or object.
 */
export default abstract class CDIFStructure {

	/** The structure's type name, or `undefined` if it is anonymous. */
	public readonly type?: string = undefined;

	protected constructor(type?: string) {
		if (isValue(type)) {
			if (!isValidTypeId(type)) {throw new CDIFSyntaxError(`Invalid type identifier: "${type}"`);}
			this.type = type;
		}
	}

	/** The strings used to open and close the structure in cDIF text */
	protected abstract get brackets(): [string, string];

	/**
	 * @param options
	 * @param cdifVersion
	 * @returns the decoded JS value
	 */
	public abstract decode(options: Required<ParserOptions>, cdifVersion: number): object;

	/**
	 * Write the structure as cDIF text to `writer`.
	 * @param writer
	 * @param options
	 */
	public writeCdifText(writer: OutputTextWriter): void {
		if (this.type) {
			writer.write(this.type);
			writer.space();
		}
		if (this.isEmpty()) {
			writer.write(this.brackets.join(""));
		} else {
			writer.openStructure(this.brackets[0]);
			this.writeDataCdifText(writer);
			writer.closeStructure(this.brackets[1]);
		}
	}

	protected abstract isEmpty(): boolean;
	protected abstract writeDataCdifText(writer: OutputTextWriter): void;

}

export class CDIFCollection extends CDIFStructure {

	/** Array of values contained by the collection */
	public readonly data: ReadonlyArray<CDIFValue>;

	public constructor(data: ReadonlyArray<CDIFValue>, type?: string) {
		super(type);
		this.data = data.slice();
	}

	protected override get brackets(): [string, string] {return ["[", "]"];}

	public override decode(options: Required<ParserOptions>, cdifVersion: number): unknown[] {
		const arr: unknown[] = new Array(this.data.length);
		for (const [i, value] of this.data.entries()) {
			const res: {value: unknown} | undefined = decodeCdifValue(i, value, options, cdifVersion);
			if (res) {
				arr[i] = res.value;
			}
		}
		return arr;
	}

	protected isEmpty(): boolean {return this.data.length === 0;}

	protected override writeDataCdifText(writer: OutputTextWriter): void {
		if (this.data.length === 0) {return;}
		for (const [i, value] of this.data.entries()) {
			const isLast: boolean = i === this.data.length - 1;
			writeCdifValueText(writer, value);
			writer.endStructureEntry(isLast);
		}
	}

}

export class CDIFObject extends CDIFStructure {

	/** Map of property names to values contained by the object */
	public readonly data: ReadonlyMap<string, CDIFValue>;

	public constructor(data: ReadonlyMap<string, CDIFValue>, type?: string) {
		super(type);
		const map: Map<string, CDIFValue> = new Map();
		for (const [property, value] of data) {
			if (!isValidName(property)) {throw new CDIFSyntaxError(`Invalid object property name: "${property}"`);}
			map.set(property, value);
		}
		this.data = map;
	}

	protected override get brackets(): [string, string] {return ["{", "}"];}

	public override decode(options: Required<ParserOptions>, cdifVersion: number): Record<string, unknown> {
		const entries: [string, unknown][] = [];
		for (const [key, value] of this.data.entries()) {
			const res: {value: unknown} | undefined = decodeCdifValue(key, value, options, cdifVersion);
			if (res) {
				entries.push([key, res.value]);
			}
		}
		return Object.fromEntries(entries);
	}

	protected isEmpty(): boolean {return this.data.size === 0;}

	protected override writeDataCdifText(writer: OutputTextWriter): void {
		for (const [i, [key, value]] of [...this.data.entries()].entries()) {
			const isLast: boolean = i === this.data.size - 1;
			writer.write(`${key}:`);
			writer.space();
			writeCdifValueText(writer, value);
			writer.endStructureEntry(isLast);
		}
	}

}
