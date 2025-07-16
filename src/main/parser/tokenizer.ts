// Tokenizer: a component of the parser used to convert cDIF strings (files included) to arrays of Token objects

import {isValue} from "@mkacct/ts-util";
import {CDIFSyntaxError} from "../errors.js";

export type Token = TokenLike<TokenType>;

interface TokenLike<T> {
	readonly type: T;
	readonly cdifText: string;
}

export enum TokenType {
	DIRECTIVE,
	NAME,
	OTHER_LITERAL,
	COMPONENT_REFERENCE,
	VALUE_TERMINATOR,
	OBJECT_START,
	OBJECT_END,
	COLLECTION_START,
	COLLECTION_END,
	KV_SEPARATOR,
	SPREAD_OPERATOR
}

/**
 * Tokenizes (aka lexes) a cDIF string (file syntax supported)
 * @param cdifText
 * @returns array of tokens
 * @throws {CDIFSyntaxError} if it encounters something other than a recognized token
 */
export function tokenizeCdifFile(cdifText: string): Token[] {
	cdifText = preprocessWhitespace(cdifText);
	const tokens: Token[] = [];
	let index: number = 0;
	while (index < cdifText.length) {
		const token = nextTokenization(cdifText, index);
		if (isToken(token)) {tokens.push(token);}
		index += token.cdifText.length;
	}
	return tokens;
}

function isToken(token: TokenLike<TokenType | null>): token is Token {
	return isValue(token.type);
}

function preprocessWhitespace(text: string): string {
	const lines: string[] = text.split("\n").map((line) => line.trimEnd());
	if (lines[lines.length - 1] !== "") {lines.push("");}
	return lines.join("\n");
}

const CHAR_ENTITY_REGEX = /(?:[^\p{C}\\]|\t)|\\(?:[^\p{C}uU]|u[\da-fA-F]{4}|U[\da-fA-F]{8})/yus;
const ML_CHAR_ENTITY_REGEX = /(?:[^\p{C}\\]|\t|\n)|\\(?:[^\p{C}uU]|u[\da-fA-F]{4}|U[\da-fA-F]{8}|\n)/yus

function nextTokenization(text: string, index: number): TokenLike<TokenType | null> {
	return tokenizerSwitch(text, index, [ // use flags /yus on all regexes!
		{regex: /^#[^\n]*$/yusm, type: TokenType.DIRECTIVE}, // /m so we can use ^ and $ to ensure match of whole line
		{regex: /,|;/yus, type: TokenType.VALUE_TERMINATOR},
		{regex: /\{/yus, type: TokenType.OBJECT_START},
		{regex: /\}/yus, type: TokenType.OBJECT_END},
		{regex: /\[/yus, type: TokenType.COLLECTION_START},
		{regex: /\]/yus, type: TokenType.COLLECTION_END},
		{regex: /:/yus, type: TokenType.KV_SEPARATOR},
		{regex: /\.\.\./yus, type: TokenType.SPREAD_OPERATOR},
		{regex: /[^\S\n]+\n?|\n/yus, type: null}, // whitespace (up to and including newline)
		{regex: /\/\/[^\n\r]*\n/yus, type: null}, // line comment
		{regex: /\/\*.*?\*\//yus, type: null}, // block comment
		{regex: /[\p{L}_][\p{L}\d$_]*/yus, type: TokenType.NAME},
		{regex: /\$[\p{L}_][\p{L}\d$_]*/yus, type: TokenType.COMPONENT_REFERENCE},
		// number types are crudely validated (the primitive value decoder validates them for real later)
		{regex: /[+-]?infinity/yus, type: TokenType.OTHER_LITERAL}, // infinity that NAME doesn't match (because sign)
		{regex: /[+-]?(?:\d[\d_]*|0[\da-zA-Z_]*)/yus, type: TokenType.OTHER_LITERAL}, // integer
		{regex: /[+-]?(?:\d[\d_]*)?\.[\d_]*(?:[eE][+-]?[\d_]*)?/yus, type: TokenType.OTHER_LITERAL}, // float
		// text types, block string before normal strings because their delimiters should take precedence
		{delimiterRegex: /'/yus, entityRegex: CHAR_ENTITY_REGEX, type: TokenType.OTHER_LITERAL},
		{delimiterRegex: /`{3,}/yus, entityRegex: /[\P{C}\t\n]/yus, isString: true, type: TokenType.OTHER_LITERAL},
		{delimiterRegex: /"{3,}/yus, entityRegex: ML_CHAR_ENTITY_REGEX, isString: true, type: TokenType.OTHER_LITERAL},
		{delimiterRegex: /`/yus, entityRegex: /[\P{C}\t]/yus, isString: true, type: TokenType.OTHER_LITERAL},
		{delimiterRegex: /"/yus, entityRegex: CHAR_ENTITY_REGEX, isString: true, type: TokenType.OTHER_LITERAL},
	], () => {
		throw new CDIFSyntaxError(`Unknown token (index ${index}; character '${text[index]}')`);
	});
}

function tokenizerSwitch(
	text: string,
	index: number,
	cases: ReadonlyArray<( // all regexes MUST have /y flag!!!
		{readonly regex: RegExp} | {
			readonly delimiterRegex: RegExp;
			readonly entityRegex: RegExp;
			readonly isString?: true;
		}
	) & {type: TokenType | null;}>,
	errorCase: () => never
): TokenLike<TokenType | null> {
	for (const entry of cases) {
		const matchText: string | null = ("delimiterRegex" in entry)
			? tryTextLiteralTokenizerCase(text, entry.delimiterRegex, entry.entityRegex, entry.isString ?? false, index)
			: checkYRegexAtPos(text, entry.regex, index);
		if (!isValue(matchText)) {continue;}
		return {type: entry.type, cdifText: matchText};
	}
	errorCase();
}

function checkYRegexAtPos(text: string, regex: RegExp, index: number): string | null {
	regex.lastIndex = index;
	const match = text.match(regex);
	return match ? match[0] : null;
}

function tryTextLiteralTokenizerCase(
	text: string, delimiterRegex: RegExp, entityRegex: RegExp, isString: boolean, index: number
): string | null {
	const originalIndex: number = index;
	const delimiterMatchText = checkYRegexAtPos(text, delimiterRegex, index);
	if (!isValue(delimiterMatchText)) {return null;}
	index += delimiterMatchText.length;
	if (isString) {
		while (true) {
			if (text.slice(index, index + delimiterMatchText.length) === delimiterMatchText) {
				index += delimiterMatchText.length;
				break;
			}
			if (index >= text.length) {throw new CDIFSyntaxError(
				`In textual literal: unexpected end of input`
			);}
			const entityMatchText = checkYRegexAtPos(text, entityRegex, index);
			if (!isValue(entityMatchText)) {throw new CDIFSyntaxError(
					`In textual literal: unknown token (index ${index}; character '${text[index]}')`
			);}
			index += entityMatchText.length;
		}
	} else {
		const entityMatchText = checkYRegexAtPos(text, entityRegex, index);
		if (!isValue(entityMatchText)) {throw new CDIFSyntaxError(
			`In textual literal: unknown token (index ${index}; character '${text[index]}')`
		);}
		index += entityMatchText.length;
		if (!(text.slice(index, index + delimiterMatchText.length) === delimiterMatchText)) {throw new CDIFSyntaxError(
			`In textual literal: expected closing delimiter (index ${index})`
		);}
		index += delimiterMatchText.length;
	}
	return text.slice(originalIndex, index);
}
