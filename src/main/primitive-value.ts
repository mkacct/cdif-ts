import {between, isValue} from "@mkacct/ts-util";
import Arrays from "@mkacct/ts-util/arrays";
import sw from "@mkacct/ts-util/switch";
import {CDIFSyntaxError} from "./errors.js";

/**
 * An encoded cDIF primitive value.
 */
export default abstract class CDIFPrimitiveValue {

	/** The major cDIF version */
	public readonly cdifVersion: number;

	protected constructor(cdifVersion: number) {
		this.cdifVersion = cdifVersion;
	}

	/** The cDIF text representation of the primitive value */
	public abstract get cdifText(): string;

	/**
	 * The parsed JS value
	 * @note this is primarily used for the decoder; some behavior may be unexpected (ex. integers are returned as `bigint`)
	 */
	public abstract get parsed(): unknown;

}

/**
 * @param cdifText input text to encode as a cDIF primitive value
 * @param cdifVersion integer major version of the cDIF specification
 * @returns the encoded cDIF primitive value
 * @throws {CDIFSyntaxError} if the input text is not a valid cDIF primitive value
 */
export function createPrimVal(cdifText: string, cdifVersion: number): CDIFPrimitiveValue {
	const primValClasses: ReadonlyArray<PrimitiveValueClass> = [
		CDIFNull,
		CDIFBoolean,
		CDIFCharacter,
		CDIFString,
		CDIFInfinite,
		CDIFInteger,
		CDIFFloat
	];
	for (const primValClass of primValClasses) {
		try {
			const primVal: CDIFPrimitiveValue = primValClass.fromCdifText(cdifText, cdifVersion);
			Object.freeze(primVal);
			return primVal;
		} catch (err) {if (!(err instanceof PrimitiveValueError)) {throw err;}}
	}
	throw new CDIFSyntaxError(`Invalid cDIF primitive value "${cdifText}"`);
}

/** Interface for the CLASS ITSELF (not an instance) denoting a certain type of primitive value. */
interface PrimitiveValueClass {
	/**
	 * @param cdifText input text to encode as a certain type of cDIF primitive value
	 * @param cdifVersion
	 * @returns the encoded cDIF primitive value, an instance of the particular class implementing this method
	 * @throws {PrimitiveValueError} if the input text is not a valid cDIF primitive value of the type denoted by the class
	 */
	fromCdifText(cdifText: string, cdifVersion: number): CDIFPrimitiveValue;
}

/**
 * Thrown when a `fromCdifText()` method fails to encode a primitive value,
 * indicating that the input text does not represent a primitive value of the type denoted by the class.
 */
class PrimitiveValueError extends Error {}

/**
 * @param cdifText input text assumed to be a cDIF numeric value
 * @returns `{isNegative, withoutSign}`
 */
function checkSign(cdifText: string): {isNegative: boolean, withoutSign: string} {
	return {
		isNegative: cdifText[0] === "-",
		withoutSign: ["+", "-"].includes(cdifText[0]) ? cdifText.slice(1) : cdifText
	};
}

export class CDIFInteger extends CDIFPrimitiveValue {

	public constructor(private readonly value: bigint, cdifVersion: number) {
		super(cdifVersion);
	}

	public override get cdifText(): string {
		return this.value.toString();
	}

	public override get parsed(): bigint {
		return this.value;
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFInteger {
		const {isNegative, withoutSign} = checkSign(cdifText);
		if (/^(?:\d(?:_?\d)*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|0[xX][\da-fA-F](?:_?[\da-fA-F])*)$/us.test(
			withoutSign
		)) {
			const withoutSeparators: string = withoutSign.replace(/_/g, "");
			const absoluteValue: bigint = BigInt(withoutSeparators);
			return new CDIFInteger(isNegative ? (-absoluteValue) : absoluteValue, cdifVersion);
		}
		throw new PrimitiveValueError();
	}

}

export class CDIFFloat extends CDIFPrimitiveValue {

	public constructor(
		private readonly isNegative: boolean, private readonly significand: string, private readonly exponent: bigint,
		cdifVersion: number
	) {
		super(cdifVersion);
		if (!/^(?:0|[1-9]\d*)\.(?:|\d*[1-9])$/us.test(significand)) {
			throw new Error(`Invalid significand: ${significand}`);
		}
	}

	public override get cdifText(): string {
		return `${
			this.isNegative ? "-" : ""
		}${
			this.significand
		}${
			(this.exponent !== 0n) ? `e${this.exponent.toString()}` : ""
		}`;
	}

	public override get parsed(): number {
		return parseFloat(`${this.isNegative ? "-" : ""}${this.significand}e${this.exponent.toString()}`);
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFFloat {
		const {isNegative, withoutSign} = checkSign(cdifText);
		const parts: ReadonlyArray<string> = withoutSign.split(/e/i);
		if (between(parts.length, 1, 2)) {
			return new CDIFFloat(
				isNegative,
				CDIFFloat.parseSignificand(parts[0]),
				(isValue(parts[1]) ? CDIFFloat.parseExponent(parts[1]) : 0n),
				cdifVersion
			);
		}
		throw new PrimitiveValueError();
	}

	private static parseSignificand(text: string): string {
		if ((text !== ".") && /^(?:\d(?:_?\d)*)?\.(?:\d(?:_?\d)*)?$/us.test(text)) {
			text = text.replace(/_/g, "");
			text = text.replace(/^0+|0+$/g, "");
			if (text[0] === ".") {text = `0${text}`;}
			return text;
		}
		throw new PrimitiveValueError();
	}

	private static parseExponent(text: string): bigint {
		const {isNegative, withoutSign} = checkSign(text);
		if (/^\d(?:_?\d)*$/us.test(withoutSign)) {
			const withoutSeparators: string = withoutSign.replace(/_/g, "");
			const absoluteValue: bigint = BigInt(withoutSeparators);
			return isNegative ? (-absoluteValue) : absoluteValue;
		}
		throw new PrimitiveValueError();
	}

}

export class CDIFInfinite extends CDIFPrimitiveValue {

	public constructor(private readonly isNegative: boolean, cdifVersion: number) {
		super(cdifVersion);
	}

	public override get cdifText(): string {
		return `${this.isNegative ? "-" : ""}infinity`;
	}

	public override get parsed(): number {
		return (this.isNegative ? -1 : 1) * Infinity;
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFInfinite {
		const {isNegative, withoutSign} = checkSign(cdifText);
		if (withoutSign === "infinity") {
			return new CDIFInfinite(isNegative, cdifVersion);
		}
		throw new PrimitiveValueError();
	}

}

/**
 * Validates a cDIF character entity and returns its canonical form.
 * @param entity a single cDIF character entity
 * @param enclosingQuote the type of quote meant to enclose the returned character entity
 * @returns the canonical form of the character entity
 * @throws {RangeError} if the input is not a single valid cDIF character entity
 */
function canonicalizeCharEntity(entity: string, enclosingQuote: "'" | "\""): string {
	if (entity[0] === "\\") { // escape sequence
		return sw(entity.slice(1), [
			["b", () => entity],
			["f", () => entity],
			["n", () => entity],
			["r", () => entity],
			["t", () => entity],
			["v", () => entity],
			["'", () => ((enclosingQuote === "'") ? "\\'" : "'")],
			["\"", () => ((enclosingQuote === "\"") ? "\\\"" : "\"")],
			["\\", () => entity],
			["/", () => "/"],
			[() => /^\\u[0-9a-fA-F]{4}$/us.test(entity), () => `\\u${entity.slice(2)}`],
			[() => /^\\U[0-9a-fA-F]{8}$/us.test(entity), () => `\\U${entity.slice(2)}`],
			[sw.DEFAULT, () => {throw new RangeError(`Invalid escape sequence`);}]
		]);
	} else if (/^\P{C}$/us.test(entity)) { // printable character
		return sw(entity, [
			["'", () => ((enclosingQuote === "'") ? "\\'" : "'")],
			["\"", () => ((enclosingQuote === "\"") ? "\\\"" : "\"")],
			[sw.DEFAULT, () => entity]
		]);
	} else { // something else (ex. control character)
		return sw(entity, [
			["\t", () => "\\t"], // tab is the only allowed control character
			[sw.DEFAULT, () => {throw new RangeError(`Invalid character entity`);}]
		]);
	}
}

/**
 * @param entity a single cDIF character entity
 * @returns the actual single character represented by the entity
 * @throws {RangeError} if the input is not a single valid cDIF character entity
 */
function parseCharEntity(entity: string): string {
	if (entity[0] === "\\") { // escape sequence
		return sw(entity.slice(1), [
			["b", () => "\b"],
			["f", () => "\f"],
			["n", () => "\n"],
			["r", () => "\r"],
			["t", () => "\t"],
			["v", () => "\v"],
			["'", () => "'"],
			["\"", () => "\""],
			["\\", () => "\\"],
			["/", () => "/"],
			[() => /^\\u[0-9a-fA-F]{4}$/us.test(entity), () => String.fromCodePoint(parseInt(entity.slice(2), 16))],
			[() => /^\\U[0-9a-fA-F]{8}$/us.test(entity), () => String.fromCodePoint(parseInt(entity.slice(2), 16))],
			[sw.DEFAULT, () => {throw new RangeError(`Invalid escape sequence`);}]
		]);
	} else if (/^\P{C}$/us.test(entity)) { // printable character
		return entity;
	} else { // something else (ex. control character)
		return sw(entity, [
			["\t", () => "\t"], // tab is the only allowed control character
			[sw.DEFAULT, () => {throw new RangeError(`Invalid character entity`);}]
		]);
	}
}

/**
 * Returns the expected length of a cDIF escape sequence for a given identifier character
 * (the character after the backslash).
 * @param idChar the character after the backslash
 * @returns the expected length of the escape sequence
 * @note doesn't validate the identifier character (if it's invalid, returns 2 anyway)
 */
function getEscapeSeqExpectedLength(idChar: string): number {
	return 2 + sw(idChar, [
		["u", 4],
		["U", 8],
		[sw.DEFAULT, 0]
	]);
}

export class CDIFCharacter extends CDIFPrimitiveValue {

	public constructor(private readonly entity: string, cdifVersion: number) {
		super(cdifVersion);
		this.entity = canonicalizeCharEntity(entity, "'");
	}

	public override get cdifText(): string {
		return `'${this.entity}'`;
	}

	public override get parsed(): string {
		return parseCharEntity(this.entity);
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFCharacter {
		if (/^'.+'$/us.test(cdifText)) {
			const entity = cdifText.slice(1, -1);
			if (entity !== "'") {
				try {
					return new CDIFCharacter(entity, cdifVersion);
				} catch (err) {if (!(err instanceof RangeError)) {throw err;}}
			}
		}
		throw new PrimitiveValueError();
	}

}

/**
 * @param str
 * @returns array of Unicode character entities in `str`
 * @note does not handle grapheme clusters!
 */
function splitIntoUnicodeChars(str: string): string[] {
	return str.match(/./gus) ?? [];
}

export class CDIFString extends CDIFPrimitiveValue {

	public constructor(private readonly entities: ReadonlyArray<string>, cdifVersion: number) {
		super(cdifVersion);
		this.entities = entities.map((ent: string): string => canonicalizeCharEntity(ent, "\""));
	}

	public override get cdifText(): string {
		return `"${this.entities.join("")}"`;
	}

	public override get parsed(): string {
		return this.entities.map((ent: string): string => parseCharEntity(ent)).join("");
	}

	private static readonly NotBlockStringError = class extends PrimitiveValueError {};

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFString {
		let entities: string[];
		try {
			entities = CDIFString.parseBlockString(cdifText);
		} catch (err) {
			if (err instanceof CDIFString.NotBlockStringError) {
				entities = CDIFString.parseOneLineString(cdifText);
			} else {throw err;}
		}
		try {
			return new CDIFString(entities, cdifVersion);
		} catch (err) {if (!(err instanceof RangeError)) {throw err;}}
		throw new PrimitiveValueError();
	}

	private static parseOneLineString(cdifText: string): string[] {
		const match = cdifText.match(/^(?<quote>["`])(?<text>.*)\1$/us);
		if (!match) {throw new PrimitiveValueError();}
		const {quote, text} = match.groups!;
		const isVerbatim: boolean = quote === "`";
		const entities: string[] = CDIFString.splitIntoEntities(text, isVerbatim, quote);
		return entities;
	}

	private static parseBlockString(cdifText: string): string[] {
		const match = cdifText.match(/^(?<delimiter>(?<quote>["`])\2{2,})(?<text>.*)\1$/us);
		if (!match) {throw new CDIFString.NotBlockStringError();}
		const {quote, delimiter, text} = match.groups!;
		const strippedText = CDIFString.handleBlockStringWhitespace(text);
		const isVerbatim: boolean = quote === "`";
		let entities: string[] = CDIFString.splitIntoEntities(strippedText, isVerbatim, delimiter);
		entities = CDIFString.processMultilineSpecificEntities(entities, isVerbatim);
		return entities;
	}

	private static splitIntoEntities(text: string, isVerbatim: boolean, delimiter: string): string[] {
		const delimiterEntities: string[] = splitIntoUnicodeChars(delimiter);
		const entities: string[] = isVerbatim
			? CDIFString.splitVerbatimIntoEntities(text)
			: CDIFString.splitEscapedIntoEntities(text);
		if (Arrays.includesSubarray(entities, delimiterEntities)) {throw new PrimitiveValueError();}
		return entities;
	}

	private static splitEscapedIntoEntities(text: string): string[] {
		const srcChars: string[] = splitIntoUnicodeChars(text);
		const entities: string[] = [];
		let escapeBuffer: string[] = [];
		while (true) {
			const char: string | undefined = srcChars.shift();
			if (!isValue(char)) {break;}
			if (escapeBuffer.length > 0) {
				escapeBuffer.push(char);
				if (escapeBuffer.length >= getEscapeSeqExpectedLength(escapeBuffer[1])) {
					entities.push(escapeBuffer.join(""));
					escapeBuffer = [];
				}
			} else {
				if (char === "\\") {
					escapeBuffer.push(char);
				} else {
					entities.push(char);
				}
			}
		}
		if (escapeBuffer.length > 0) {throw new PrimitiveValueError();}
		return entities;
	}

	private static splitVerbatimIntoEntities(text: string): string[] {
		return splitIntoUnicodeChars(text).map((char: string): string => (
			(char === "\\") ? "\\\\" : char
		));
	}

	private static handleBlockStringWhitespace(text: string): string {
		const lines: string[] = text.split("\n");
		if (lines.length === 1) {return lines[0];}
		let preservedFirstLine: string | null = null;
		const firstLine = lines.shift()!;
		if (!/^\s*$/us.test(firstLine)) {
			preservedFirstLine = firstLine;
		}
		if (/^\s*$/us.test(lines[lines.length - 1])) {
			lines.pop();
		}
		CDIFString.stripCommonIndentFromNonEmptyLines(lines);
		if (isValue(preservedFirstLine)) {
			lines.unshift(preservedFirstLine);
		}
		return lines.join("\n");
	}

	private static stripCommonIndentFromNonEmptyLines(lines: string[]): void { // mutates lines in-place
		let commonIndent: string | null = null;
		for (const line of lines) { // determine common indent
			if (line.length === 0) {continue;} // skip empty lines
			const match = line.match(/^\s*/us);
			const indent = match ? match[0] : "";
			if (!isValue(commonIndent)) {
				commonIndent = indent;
			} else {
				const oldCommonIndent = commonIndent;
				commonIndent = "";
				for (let i = 0; i < oldCommonIndent.length && i < indent.length; i++) {
					if (oldCommonIndent[i] === indent[i]) {
						commonIndent += indent[i];
					} else {
						break;
					}
				}
			}
			if (commonIndent.length === 0) {return;} // end early; there won't be any common indent
		}
		if (!isValue(commonIndent)) {return;} // there were no non-empty lines
		for (let i = 0; i < lines.length; i++) { // strip common indent
			if (lines[i].length === 0) {continue;} // skip empty lines
			lines[i] = lines[i].slice(commonIndent.length);
		}
	}

	private static processMultilineSpecificEntities(entities: ReadonlyArray<string>, isVerbatim: boolean): string[] {
		let res: string[] = entities.map((ent: string): string => (ent === "\n") ? "\\n" : ent); // escape newlines
		if (!isVerbatim) {
			res = res.filter((ent: string): boolean => ent !== "\\\n"); // line continuations resolve to nothing
		}
		return res;
	}

}

export class CDIFBoolean extends CDIFPrimitiveValue {

	public constructor(private readonly value: boolean, cdifVersion: number) {
		super(cdifVersion);
	}

	public override get cdifText(): string {
		return this.value ? "true" : "false";
	}

	public override get parsed(): boolean {
		return this.value;
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFBoolean {
		switch (cdifText) {
			case "true": {return new CDIFBoolean(true, cdifVersion);}
			case "false": {return new CDIFBoolean(false, cdifVersion);}
		}
		throw new PrimitiveValueError();
	}

}

export class CDIFNull extends CDIFPrimitiveValue {

	public constructor(cdifVersion: number) {
		super(cdifVersion);
	}

	public override get cdifText(): string {
		return "null";
	}

	public override get parsed(): null {
		return null;
	}

	public static fromCdifText(cdifText: string, cdifVersion: number): CDIFNull {
		if (cdifText === "null") {return new CDIFNull(cdifVersion);}
		throw new PrimitiveValueError();
	}

}
