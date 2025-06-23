import {isValue} from "@mkacct/ts-util";
import {CDIFValue} from "./cdif.js";
import {CDIFSyntaxError} from "./errors.js";
import {isValidName, isValidTypeId} from "./identifiers.js";

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

}

export class CDIFCollection extends CDIFStructure {

	/** Array of values contained by the collection */
	public readonly data: readonly CDIFValue[];

	public constructor(data: readonly CDIFValue[], type?: string) {
		super(type);
		this.data = data.slice();
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

}
