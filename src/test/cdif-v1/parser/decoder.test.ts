// tests the decoder directly using the decodeCdifValue() function, independently of any other parser components

import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {CDIFValue} from "../../../main/general.js";
import {parseParserOptions, ParserOptions} from "../../../main/options.js";
import decodeCdifValue, {ParserPostprocessorFunction} from "../../../main/parser/decoder.js";
import {
	CDIFBoolean,
	CDIFCharacter,
	CDIFFloat,
	CDIFInteger,
	CDIFNull,
	CDIFString
} from "../../../main/primitive-value.js";
import {CDIFCollection, CDIFObject} from "../../../main/structure.js";
import {VER} from "../context.js";

suite("v1 decoder", (): void => {

	interface DecoderTestFunction {
		(value: CDIFValue): {value: unknown} | undefined;
	}

	function testDecoder(options: ParserOptions, cdifVersion: number): DecoderTestFunction {
		const reqOptions: Required<ParserOptions> = parseParserOptions(options);
		return (value: CDIFValue): {value: unknown} | undefined => (
			decodeCdifValue(null, value, reqOptions, cdifVersion)
		);
	}

	const postprocessors: ReadonlyArray<ParserPostprocessorFunction> = [
		({key, value}) => { // priority example
			if (key === "prio_retain") {
				return {value}
			};
		},
		({value}) => { // omission example
			if ((typeof value === "string") && value.startsWith("ignore_")) {
				return CDIF.OMIT_PROPERTY;
			}
		},
		({type, value}) => { // type handling example
			if (type === "Color") {
				if (
					("r" in value) && (typeof value.r === "number")
					&& ("g" in value) && (typeof value.g === "number")
					&& ("b" in value) && (typeof value.b === "number")
				) {
					return {value: "#"
						+ value.r.toString(16).padStart(2, "0")
						+ value.g.toString(16).padStart(2, "0")
						+ value.b.toString(16).padStart(2, "0")
					};
				}
				throw new Error(`bad color!!!`);
			}
		},
		({key, value}) => { // modification example
			if (key === "coolUsername") {
				return {value: `Xx_${value}_xX`};
			}
		},
		({type, value}) => { // AddNumbers for bigint test
			if (type === "AddNumbers") {
				return {value: {...value, b: 42, c: 42n}};
			}
		}
	];

	const decoderTestFn: DecoderTestFunction = testDecoder({
		postprocessors: postprocessors
	}, VER);

	const decoderTestFnBigInt: DecoderTestFunction = testDecoder({
		postprocessors: postprocessors,
		useBigInt: true
	}, VER);

	test("primitive value", (): void => {
		assert.deepEqual(decoderTestFn(new CDIFFloat(true, "42.125", 1n, VER)), {value: -421.25});
		assert.deepEqual(decoderTestFn(new CDIFCharacter("\\U0001F600", VER)), {value: "😀"});
		assert.deepEqual(decoderTestFn(new CDIFString(["a", "\\n", "b"], VER)), {value: "a\nb"});
		assert.deepEqual(decoderTestFn(new CDIFBoolean(false, VER)), {value: false});
		assert.deepEqual(decoderTestFn(new CDIFNull(VER)), {value: null});
	});

	test("decoded type of primitive integer", (): void => {
		assert.deepEqual(decoderTestFn(new CDIFInteger(147n, VER)), {value: 147});
		assert.deepEqual(decoderTestFnBigInt(new CDIFInteger(147n, VER)), {value: 147n});
	});

	test("values added by postprocessors retain number type", (): void => {
		assert.deepEqual(decoderTestFn(new CDIFCollection([
			new CDIFObject(new Map<string, CDIFValue>([
				["a", new CDIFInteger(531n, VER)]
			]), "AddNumbers")
		])), {value: [{a: 531, b: 42, c: 42n}]});
		assert.deepEqual(decoderTestFnBigInt(new CDIFCollection([
			new CDIFObject(new Map<string, CDIFValue>([
				["a", new CDIFInteger(531n, VER)]
			]), "AddNumbers")
		])), {value: [{a: 531n, b: 42, c: 42n}]});
	});

	test("simple structures", (): void => {
		assert.deepEqual(decoderTestFn(new CDIFCollection([])), {value: []})
		assert.deepEqual(decoderTestFn(new CDIFObject(new Map<string, CDIFValue>())), {value: {}})
		assert.deepEqual(decoderTestFn(new CDIFCollection([
			new CDIFInteger(1n, VER),
			new CDIFString("foo".split(""), VER),
			new CDIFBoolean(true, VER)
		])), {value: [1, "foo", true]});
		assert.deepEqual(decoderTestFn(new CDIFObject(new Map<string, CDIFValue>([
			["a", new CDIFInteger(1n, VER)],
			["b", new CDIFString("foo".split(""), VER)],
			["c", new CDIFBoolean(true, VER)]
		]))), {value: {
			a: 1,
			b: "foo",
			c: true
		}});
	});

	test("preprocessors and types", (): void => {
		assert.deepEqual(decoderTestFn(new CDIFObject(new Map<string, CDIFValue>([
			["name", new CDIFString("Maddie".split(""), VER)],
			["coolUsername", new CDIFString("m4ddie".split(""), VER)],
			["color", new CDIFObject(new Map<string, CDIFValue>([
				["r", new CDIFInteger(255n, VER)],
				["g", new CDIFInteger(51n, VER)],
				["b", new CDIFInteger(153n, VER)]
			]), "Color")],
			["items", new CDIFCollection([
				new CDIFString("egg".split(""), VER),
				new CDIFString("backup egg".split(""), VER)
			])],
			["weirdThing", new CDIFString("ignore_me".split(""), VER)],
			["prio_retain", new CDIFString("ignore_me_not".split(""), VER)]
		]), "ThisTypeWillBeIgnored")), {value: {
			name: "Maddie",
			coolUsername: "Xx_m4ddie_xX",
			color: "#ff3399",
			items: ["egg", "backup egg"],
			prio_retain: "ignore_me_not"
		}});
	});

});
