// Analyzer: creates an abstract syntax tree given an array of tokens

import {throwInExpr} from "@mkacct/ts-util";
import sw from "@mkacct/ts-util/switch";
import {CDIFSyntaxError} from "../../errors.js";
import {Token, TokenId, TokenLike} from "../tokenizer.js";

export enum ASTNodeId {
	LITERAL,
	OBJECT,
	OBJECT_ENTRY,
	COLLECTION,
	COMPONENT_REFERENCE,
	SPREAD_REFERENCE
}

interface ASTNode {
	readonly id: ASTNodeId;
}

export type ASTValue = ASTLiteral | ASTStructure | ASTComponentReference;

export interface ASTLiteral extends ASTNode {
	readonly id: ASTNodeId.LITERAL;
	readonly cdifText: string;
}

interface ASTStructureBase<I extends ASTNodeId, E extends ASTNode> extends ASTNode {
	readonly id: I;
	readonly typeName?: string;
	readonly contents: ReadonlyArray<E | ASTSpreadReference>;
}

export type ASTStructure = ASTObject | ASTCollection;
export type ASTObject = ASTStructureBase<ASTNodeId.OBJECT, ASTObjectEntry>;
export type ASTCollection = ASTStructureBase<ASTNodeId.COLLECTION, ASTValue>;

export interface ASTObjectEntry extends ASTNode {
	readonly id: ASTNodeId.OBJECT_ENTRY;
	readonly key: string;
	readonly value: ASTValue;
}

interface ASTComponentRefBase<I extends ASTNodeId> extends ASTNode {
	readonly id: I;
	readonly componentName: string;
}

export type ASTComponentReference = ASTComponentRefBase<ASTNodeId.COMPONENT_REFERENCE>;
export type ASTSpreadReference = ASTComponentRefBase<ASTNodeId.SPREAD_REFERENCE>;

class TokenReader {
	static readonly #dummyToken: TokenLike<null> = {
		id: null,
		get cdifText() {return throwInExpr<string>(new Error(`Tried to get cdifText of dummy token`));}
	}

	readonly #tokens: ReadonlyArray<Token>;
	#index: number = 0;

	public constructor(tokens: ReadonlyArray<Token>) {
		this.#tokens = tokens;
	}

	public isValid(): boolean {return this.#index in this.#tokens;}

	public get(): TokenLike<TokenId | null> {
		return this.isValid() ? this.#tokens[this.#index] : TokenReader.#dummyToken;
	}

	public next(): void {
		if (this.isValid()) {this.#index++;}
	}
}

function tokenToErrStr(token: TokenLike<TokenId | null>): string {
	return (token.id === null) ? `end of input` : `"${token.cdifText}"`;
}

/**
 * @param tokens array of tokens for one section
 * @returns syntax tree for the section
 * @throws {CDIFSyntaxError} if the section has bad syntax
 */
export default function createSectionSyntaxTree(tokens: ReadonlyArray<Token>): ASTValue {
	const reader: TokenReader = new TokenReader(tokens);
	const value: ASTValue = parseValue(reader);
	if (reader.get().id === TokenId.VALUE_TERMINATOR) {reader.next();}
	if (reader.isValid()) {throw new CDIFSyntaxError(`Unexpected token after section: ${tokenToErrStr(reader.get())}`);}
	return value;
}

function commonErrorCases(
	token: TokenLike<TokenId | null>, contextName: string
): ReadonlyArray<readonly [TokenId | null | typeof sw.DEFAULT, (value: TokenId | null) => never]> {
	return [
		[null, () => {throw new CDIFSyntaxError(`Unexpected end of input in ${contextName}`);}],
		[sw.DEFAULT, () => {throw new CDIFSyntaxError(`Unexpected token in ${contextName}: ${tokenToErrStr(token)}`);}]
	];
}

function parseValue(reader: TokenReader): ASTValue {
	return sw<TokenId | null, ASTValue>(reader.get().id, [
		[TokenId.NAME, () => {
			try {
				return parseLiteral(reader);
			} catch (err) {
				if (err instanceof CDIFSyntaxError) {
					const typeName: string = reader.get().cdifText;
					reader.next();
					return parseStructure(reader, typeName);
				} else {throw err;}
			}
		}],
		[TokenId.OTHER_LITERAL, () => parseLiteral(reader)],
		[TokenId.OBJECT_START, () => parseStructure(reader)],
		[TokenId.COLLECTION_START, () => parseStructure(reader)],
		[TokenId.COMPONENT_REFERENCE, () => parseComponentRef(reader)],
		...commonErrorCases(reader.get(), "value")
	]);
}

function parseLiteral(reader: TokenReader): ASTLiteral {
	function yieldLiteral(): ASTLiteral {
		const res: ASTLiteral = {
			id: ASTNodeId.LITERAL,
			cdifText: reader.get().cdifText
		};
		reader.next();
		return res;
	}

	return sw<TokenId | null, ASTLiteral>(reader.get().id, [
		[TokenId.NAME, () => {
			if (["true", "false", "null"].includes(reader.get().cdifText)) {
				return yieldLiteral();
			}
			throw new CDIFSyntaxError(`Invalid keyword literal: ${tokenToErrStr(reader.get())}`);
		}],
		[TokenId.OTHER_LITERAL, () => yieldLiteral()],
		...commonErrorCases(reader.get(), "literal"),
	]);
}

function parseStructure(reader: TokenReader, typeName?: string): ASTStructure {
	return sw<TokenId | null, ASTStructure>(reader.get().id, [
		[TokenId.OBJECT_START, () => parseObject(reader, typeName)],
		[TokenId.COLLECTION_START, () => parseCollection(reader, typeName)],
		...commonErrorCases(reader.get(), "structure")
	]);
}

const parseObject: (reader: TokenReader, typeName?: string) => ASTObject = createStructureParser(
	"object", ASTNodeId.OBJECT, TokenId.OBJECT_START, TokenId.OBJECT_END, parseObjectMapping
);
const parseCollection: (reader: TokenReader, typeName?: string) => ASTCollection = createStructureParser(
	"collection", ASTNodeId.COLLECTION, TokenId.COLLECTION_START, TokenId.COLLECTION_END, parseValue
);

function createStructureParser<I extends ASTNodeId, E extends ASTNode>(
	contextName: string,
	nodeId: I,
	startTokenId: TokenId,
	endTokenId: TokenId,
	entryParser: (reader: TokenReader) => (E | null)
) {
	return (reader: TokenReader, typeName?: string): ASTStructureBase<I, E> => {
		assertTokenId(reader.get(), startTokenId, `start of ${contextName}`);
		reader.next();
		const contents: (E | ASTSpreadReference)[] = [];
		let done: boolean = false;
		let entryNext: boolean = true;
		while (!done) {
			sw<TokenId | null, void>(reader.get().id, [
				[TokenId.VALUE_TERMINATOR, () => {
					if (entryNext) {
						throw new CDIFSyntaxError(`Unexpected value separator in ${contextName}`);
					} else {
						reader.next();
						entryNext = true;
					}
				}],
				[endTokenId, () => {
					reader.next();
					done = true;
				}],
				[TokenId.SPREAD_OPERATOR, () => {
					contents.push(parseSpreadRef(reader));
					entryNext = false;
				}],
				[sw.DEFAULT, () => {
					if (entryNext) {
						const res: E | null = entryParser(reader);
						if (res) {contents.push(res);}
						entryNext = false;
					} else {
						throw new CDIFSyntaxError(`Unexpected in ${contextName}: ${tokenToErrStr(reader.get())}`);
					}
				}]
			]);
		}
		return {
			id: nodeId,
			typeName: typeName,
			contents: contents
		};
	};
}

function parseObjectMapping(reader: TokenReader): ASTObjectEntry | null {
	assertTokenId(reader.get(), TokenId.NAME, "name");
	const key: string = reader.get().cdifText;
	reader.next();
	assertTokenId(reader.get(), TokenId.KV_SEPARATOR, "object mapping separator");
	reader.next();
	if ((reader.get().id === TokenId.NAME) && (reader.get().cdifText === "undef")) {
		reader.next();
		return null;
	}
	const value: ASTValue = parseValue(reader);
	return {
		id: ASTNodeId.OBJECT_ENTRY,
		key: key,
		value: value
	};
}

function parseComponentRef(reader: TokenReader): ASTComponentReference {
	assertTokenId(reader.get(), TokenId.COMPONENT_REFERENCE, "component reference");
	if (!reader.get().cdifText.startsWith("$")) {
		throw new CDIFSyntaxError(`Invalid component reference: ${tokenToErrStr(reader.get())}`);
	}
	const componentName: string = reader.get().cdifText.slice(1);
	reader.next();
	return {
		id: ASTNodeId.COMPONENT_REFERENCE,
		componentName: componentName
	};
}

function parseSpreadRef(reader: TokenReader): ASTSpreadReference {
	assertTokenId(reader.get(), TokenId.SPREAD_OPERATOR, "spread operator");
	reader.next();
	return {
		id: ASTNodeId.SPREAD_REFERENCE,
		componentName: parseComponentRef(reader).componentName
	};
}

function assertTokenId<I extends TokenId>(
	token: TokenLike<TokenId | null>, expectedId: I, expectedName: string
): asserts token is TokenLike<I> {
	if (token.id !== expectedId) {
		throw new CDIFSyntaxError(`Expected ${expectedName}, got ${tokenToErrStr(token)}`);
	}
}
