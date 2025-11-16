// Preparser: handles directives and splits the file into sections

import sw from "@mkacct/ts-util/switch";
import {CDIFDirectiveError, CDIFSyntaxError} from "../../errors.js";
import {validateCdifVersionString} from "../../general.js";
import {ParserOptions} from "../../options.js";
import {Token, TokenId} from "../tokenizer.js";
import {SectionId} from "./parser.js";

/**
 * Handles directives and splits the file into sections.
 * @param tokens output of tokenizer
 * @param options
 * @param cdifVersion
 * @returns tokens by section
 * @throws {CDIFSyntaxError} if a directive has invalid syntax
 * @throws {CDIFDirectiveError} if an unknown directive is encountered
 * @throws {CDIFDirectiveError} if a directive is used incorrectly
 * @throws {CDIFDirectiveError} if `allowUnexpectedVersionString` is false and the "cDIF" directive is used with an unexpected version string
 */
export default function handleDirectives(
	tokens: ReadonlyArray<Token>,
	options: Required<ParserOptions>,
	cdifVersion: number
): Map<SectionId, ReadonlyArray<Token>> {
	const sectionTokens: Map<SectionId, ReadonlyArray<Token>> = new Map();
	let curSection: Token[] = [];

	function startSection(id: SectionId): void {
		if (sectionTokens.has(id)) {throw new CDIFDirectiveError(`Cannot begin section ${SectionId[id]} again`);}
		curSection = [];
		sectionTokens.set(id, curSection);
	}

	const handlers: Record<string, (arg: string, index: number) => void> = {
		"cDIF": (arg, index) => {
			if (index !== 0) {throw new CDIFDirectiveError(`"cDIF" directive may only occur at start of file`);}
			if (options.allowUnexpectedVersionString) {return;}
			const versionString: string = arg.trim();
			try {
				validateCdifVersionString(versionString, cdifVersion);
			} catch (err) {
				if (err instanceof Error) {
					throw new CDIFDirectiveError(err.message);
				} else {throw err;}
			}
		},
		"components": () => {startSection(SectionId.COMPONENTS);}
	};

	startSection(SectionId.MAIN);

	for (const [i, token] of tokens.entries()) {
		if (token.id === TokenId.DIRECTIVE) {
			const match = token.cdifText.match(/^#\s*(?<name>\S+)\s*(?<arg>.*)$/us);
			if (!match) {throw new CDIFSyntaxError(`Invalid directive syntax: "${token.cdifText}"`);}
			const groups = match.groups as {name: string, arg: string};
			sw(groups.name, [
				...Object.entries(handlers).map<[string, () => void]>(([name, handler]) => (
					[name, () => handler(groups.arg, i)]
				)),
				[sw.DEFAULT, (name) => {throw new CDIFDirectiveError(`Unknown directive: "${name}"`);}]
			]);
		} else {
			curSection.push(token);
		}
	}
	return sectionTokens;
}
