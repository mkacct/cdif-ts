// tests the whole serializer

import {block, fold} from "@mkacct/ts-util/strings";
import {matrixStrategy} from "@mkacct/ts-util/tests";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {CDIFError, CDIFSyntaxError, CDIFTypeError} from "../../../main/errors.js";
import {CDIFCharacter, CDIFInteger, CDIFNull, CDIFString} from "../../../main/primitive-value.js";
import {SerializerPreprocessorFunction} from "../../../main/serializer/encoder.js";
import {SerializerOptions} from "../../../main/serializer/serializer.js";
import {reverseRecord} from "../../test-util.js";
import {VER} from "../context.js";

suite("v1 CDIF.serialize()", (): void => {

	const cdif = new CDIF(VER);

	const preprocessors: ReadonlyArray<SerializerPreprocessorFunction> = [
		({key, value}) => { // priority example
			if (key === "ignore_notReally") {
				return {value};
			}
		},
		({key}) => { // omission example
			if ((typeof key === "string") && key.startsWith("ignore_")) {
				return CDIF.OMIT_PROPERTY;
			}
		},
		({key, value}) => { // typing example
			if (key === "color") {
				return {type: "Color", value};
			}
		},
		({key, value}) => { // modification example
			if (key === "coolUsername") {
				return {value: `Xx_${value}_xX`};
			}
		},
	];

	const optionsObjs: Record<string, SerializerOptions> = {
		default: {
			preprocessors: preprocessors
		},
		pretty: {
			preprocessors: preprocessors,
			indent: "\t",
			structureEntrySeparator: ";"
		}
	};

	const optionsNames: Map<SerializerOptions, string> = reverseRecord(optionsObjs);

	matrixStrategy({options: Object.values(optionsObjs)}, (matrix): void => {
		test(`primitive values (${optionsNames.get(matrix.options)})`, (): void => {
			assert.equal(cdif.serialize(42n, matrix.options), `42`);
			assert.equal(cdif.serialize("foo", matrix.options), `"foo"`);
			assert.equal(cdif.serialize(null, matrix.options), `null`);
		});
	});

	matrixStrategy({options: Object.values(optionsObjs)}, (matrix): void => {
		test(`pre-encoded primitive values (${optionsNames.get(matrix.options)})`, (): void => {
			assert.equal(cdif.serialize(new CDIFInteger(42n, VER), matrix.options), `42`);
			assert.equal(cdif.serialize(new CDIFString("foo".split(""), VER), matrix.options), `"foo"`);
			assert.equal(cdif.serialize(new CDIFNull(VER), matrix.options), `null`);
		});
	});

	test("simple structures (default)", (): void => {
		assert.equal(cdif.serialize([], optionsObjs.default), `[]`);
		assert.equal(cdif.serialize({}, optionsObjs.default), `{}`);
		assert.equal(cdif.serialize([1, "foo", true], optionsObjs.default), `[1., "foo", true]`);
		assert.equal(cdif.serialize({a: 1, b: "foo", c: true}, optionsObjs.default), `{a: 1., b: "foo", c: true}`);
	});

	test("simple structures (pretty)", (): void => {
		assert.equal(cdif.serialize([], optionsObjs.pretty), `[]`);
		assert.equal(cdif.serialize({}, optionsObjs.pretty), `{}`);
		assert.equal(cdif.serialize([1, "foo", true], optionsObjs.pretty), block(3, `
			[
				1.;
				"foo";
				true;
			]
		`));
		assert.equal(cdif.serialize({a: 1, b: "foo", c: true}, optionsObjs.pretty), block(3, `
			{
				a: 1.;
				b: "foo";
				c: true;
			}
		`));
	});

	test("preprocessors and types (default)", (): void => {
		assert.equal(cdif.serialize({
			name: "Maddie",
			coolUsername: "m4dd1e",
			color: {red: 255, green: 51, blue: 153},
			items: ["egg", "fake \"bacon\""],
			ignore_field: "ignore this!",
			ignore_notReally: "don't ignore me",
			examplePreencoded: new CDIFCharacter("a", VER)
		}, optionsObjs.default), fold(3, `
			{name: "Maddie",
			coolUsername: "Xx_m4dd1e_xX",
			color: Color {red: 255., green: 51., blue: 153.},
			items: ["egg", "fake \\"bacon\\""],
			ignore_notReally: "don't ignore me",
			examplePreencoded: 'a'}
		`));
	});

	test("preprocessors and types (pretty)", (): void => {
		assert.equal(cdif.serialize({
			name: "Maddie",
			coolUsername: "m4dd1e",
			color: {red: 255, green: 51, blue: 153},
			items: ["egg", "fake \"bacon\""],
			ignore_field: "ignore this!",
			ignore_notReally: "don't ignore me",
			examplePreencoded: new CDIFCharacter("a", VER)
		}, optionsObjs.pretty), block(3, `
			{
				name: "Maddie";
				coolUsername: "Xx_m4dd1e_xX";
				color: Color {
					red: 255.;
					green: 51.;
					blue: 153.;
				};
				items: [
					"egg";
					"fake \\"bacon\\"";
				];
				ignore_notReally: "don't ignore me";
				examplePreencoded: 'a';
			}
		`));
	});

	suite("error cases", (): void => {

		const options: SerializerOptions = {
			preprocessors: [
				({key, value}) => {
					if (key === "badTypeName") {
						return {value, type: "Bad Type Name"};
					}
				},
				({value}) => {
					if (value === "PLEASE OMIT ME THANK YOU") {
						return CDIF.OMIT_PROPERTY;
					}
				}
			]
		};

		test("CDIFPrimitiveValue with wrong version", (): void => {
			assert.throws(() => cdif.serialize(new CDIFInteger(42n, 2), options), CDIFError);
		});

		test("cannot omit collection value", (): void => {
			assert.throws(() => cdif.serialize(["PLEASE OMIT ME THANK YOU"], options), CDIFError);
		});

		test("invalid object key name", (): void => {
			assert.throws(() => cdif.serialize({"uh oh spaces in key": "nope"}, options), CDIFSyntaxError);
		});

		test("invalid type identifier", (): void => {
			assert.throws(() => cdif.serialize({"badTypeName": {}}, options), CDIFSyntaxError);
		});

		test("invalid input type", (): void => {
			assert.throws(() => cdif.serialize(Symbol("uh oh symbol"), options), CDIFTypeError);
		});

	});

	suite("circular reference detection", (): void => {

		test("duplicate reference, but not circular", (): void => {
			const child = {a: 1};
			cdif.serialize({a: child, b: child}, optionsObjs.default);
		});

		test("circular reference", (): void => {
			let circular: {a: unknown} = {a: null};
			circular.a = circular;
			assert.throws(() => cdif.serialize(circular, optionsObjs.default), CDIFTypeError);
		});

	});

	test("weird options and miscellanea", (): void => {
		assert.equal(cdif.serialize({
			x: 1,
			coolUsername: "not_that_cool",
			list: [1n, 2n, 3n],
			undefinedGetsIgnored: undefined
		}, {
			indent: "..",
			structureEntrySeparator: ",",
			addFinalStructureEntrySeparator: true
		}), block(3, `
			{
			..x: 1.,
			..coolUsername: "not_that_cool",
			..list: [
			....1,
			....2,
			....3,
			..],
			}
		`));
	});

});
