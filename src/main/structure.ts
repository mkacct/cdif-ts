import {isValue} from "@mkacct/ts-util";
import {CDIFSyntaxError} from "./errors.js";
import {CDIFValue} from "./general.js";
import {isValidName, isValidTypeId} from "./identifiers.js";
import {SerializerOptions} from "./options.js";
import {PrettyTextWriter, writeCdifValueText} from "./serializer/stringifier.js";

/**
 * Either a cDIF collection or object.
 */
export default abstract class CDIFStructure {

	/** The structure's type name, or `undefined` if it is anonymous. */
	protected readonly type?: string = undefined;

	protected constructor(type?: string) {
		if (isValue(type)) {
			if (!isValidTypeId(type)) {throw new CDIFSyntaxError(`Invalid type identifier: "${type}"`);}
			this.type = type;
		}
	}

	/** The strings used to open and close the structure in cDIF text */
	protected abstract get brackets(): [string, string];

	/**
	 * Write the structure as cDIF text to `writer`.
	 * @param writer
	 * @param options
	 */
	public writeCdifText(writer: PrettyTextWriter, options: Required<SerializerOptions>): void {
		if (this.type) {
			writer.write(this.type, " ", false);
		}
		writer.write(this.brackets[0], "", true);
		writer.changeIndent(1);
		this.writeDataCdifText(writer, options);
		writer.changeIndent(-1);
		writer.write(this.brackets[1], "", false);
	}

	protected abstract writeDataCdifText(writer: PrettyTextWriter, options: Required<SerializerOptions>): void;

}

export class CDIFCollection extends CDIFStructure {

	/** Array of values contained by the collection */
	public readonly data: ReadonlyArray<CDIFValue>;

	public constructor(data: ReadonlyArray<CDIFValue>, type?: string) {
		super(type);
		this.data = data.slice();
	}

	protected get brackets(): [string, string] {return ["[", "]"];}

	protected override writeDataCdifText(writer: PrettyTextWriter, options: Required<SerializerOptions>): void {
		for (const [i, value] of this.data.entries()) {
			const isLast: boolean = i === this.data.length - 1;
			writeCdifValueText(writer, value, options);
			writeSeparator(writer, options, isLast);
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

	protected get brackets(): [string, string] {return ["{", "}"];}

	protected override writeDataCdifText(writer: PrettyTextWriter, options: Required<SerializerOptions>): void {
		for (const [i, [key, value]] of [...this.data.entries()].entries()) {
			const isLast: boolean = i === this.data.size - 1;
			writer.write(`${key}: `);
			writeCdifValueText(writer, value, options);
			writeSeparator(writer, options, isLast);
		}
	}

}

function writeSeparator(writer: PrettyTextWriter, options: Required<SerializerOptions>, isLast: boolean): void {
	writer.write(
		(!isLast || options.addFinalStructureEntrySeparator) ? options.structureEntrySeparator : "",
		isLast ? "" : " ",
		true
	);
}
