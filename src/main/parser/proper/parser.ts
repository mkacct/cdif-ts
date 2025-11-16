// Parser proper: between the tokenizer and decoder, calls the main components of the parser
// (Takes an array of tokens and returns a CDIFValue)

import {isValue} from "@mkacct/ts-util";
import {CDIFSyntaxError} from "../../errors.js";
import {CDIFValue} from "../../general.js";
import {ParserOptions} from "../../options.js";
import {Token} from "../tokenizer.js";
import createSectionSyntaxTree, {ASTNodeId, ASTObject, ASTValue} from "./analyzer.js";
import evaluateAstValue from "./evaluator.js";
import handleDirectives from "./preparser.js";

export enum SectionId {
	MAIN,
	COMPONENTS
}

/**
 * @param tokens output from tokenizer
 * @param options
 * @param cdifVersion
 * @returns `CDIFValue`, input to decoder
 * @throws {CDIFSyntaxError} if the input has invalid syntax
 * @throws {CDIFDirectiveError} if an unknown directive is encountered
 * @throws {CDIFDirectiveError} if a directive is used incorrectly
 * @throws {CDIFDirectiveError} if `allowUnexpectedVersionString` is false and the "cDIF" directive is used with an unexpected version string
 * @throws {CDIFReferenceError} if a component reference is not defined
 * @throws {CDIFReferenceError} if a circular component reference is encountered
 * @throws {CDIFTypeError} if a spread expression is used with a component of the wrong type
*/
export default function parseCdifTokens(
	tokens: ReadonlyArray<Token>,
	options: Required<ParserOptions>,
	cdifVersion: number
): CDIFValue {
	// 1. Handle directives and split file into sections (preparser.ts)
	const sectionTokens: ReadonlyMap<SectionId, ReadonlyArray<Token>> = handleDirectives(
		tokens, options, cdifVersion
	);
	// 2. Create a syntax tree for each section (analyzer.ts)
	const sectionTrees: Map<SectionId, ASTValue> = new Map();
	for (const [type, tokens] of sectionTokens) {
		sectionTrees.set(type, createSectionSyntaxTree(tokens));
	}
	// 3. Evaluate syntax tree(s) generating a CDIFValue (evaluator.ts)
	const main = sectionTrees.get(SectionId.MAIN);
	const components = sectionTrees.get(SectionId.COMPONENTS);
	if (!main) {throw new Error(`Main section is missing`);} // should never happen
	if (components) {
		if (components.id !== ASTNodeId.OBJECT) {throw new CDIFSyntaxError(`Components section value must be object`);}
		if (isValue(components.typeName)) {throw new CDIFSyntaxError(`Components section object must be anonymous`);}
	}
	const componentsMap: Map<string, ASTValue> = components ? createComponentsMap(components) : new Map();
	return evaluateAstValue(main, componentsMap, cdifVersion);
}

function createComponentsMap(components: ASTObject): Map<string, ASTValue> {
	const map: Map<string, ASTValue> = new Map();
	for (const entry of components.contents) {
		if (entry.id === ASTNodeId.SPREAD_REFERENCE) {
			throw new CDIFSyntaxError(`Top level of components section may not contain spread expressions`);
		}
		map.set(entry.key, entry.value);
	}
	return map;
}
