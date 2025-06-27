import {block, fold} from "@mkacct/ts-util/strings";
import {matrixStrategy} from "@mkacct/ts-util/tests";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../main/cdif.js";
import {CDIFCharacter, CDIFInteger, CDIFNull, CDIFString} from "../../main/primitive-value.js";
import {SerializerPreprocessorFunction} from "../../main/serializer/encoder.js";
import {reverseRecord} from "./test-util.js";

suite("CDIF.serialize", (): void => {

	const VER: number = 1;

	const preprocessors: ReadonlyArray<SerializerPreprocessorFunction> = [
		({key, value}) => { // priority example
			if (key === "ignore_notReally") {
				return {value};
			}
		},
		({key}) => { // omission example
			if ((typeof key === "string") && key.startsWith("ignore_")) {
				return CDIF.SERIALIZER_OMIT_PROPERTY;
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
		}
	];

	const cdifs: Record<string, CDIF> = {
		default: new CDIF({cdifVersion: VER, serializer: {
			preprocessors: preprocessors
		}}),
		pretty: new CDIF({cdifVersion: VER, serializer: {
			preprocessors: preprocessors,
			indent: "\t",
			structureEntrySeparator: ";"
		}})
	};

	const cdifNames: Map<CDIF, string> = reverseRecord(cdifs);

	matrixStrategy({cdif: Object.values(cdifs)}, (matrix): void => {
		const cdif: CDIF = matrix.cdif;
		test(`Primitive values (${cdifNames.get(matrix.cdif)})`, (): void => {
			assert.equal(cdif.serialize(42n), `42`);
			assert.equal(cdif.serialize("foo"), `"foo"`);
			assert.equal(cdif.serialize(null), `null`);
		});
	});

	matrixStrategy({cdif: Object.values(cdifs)}, (matrix): void => {
		const cdif: CDIF = matrix.cdif;
		test(`Pre-encoded primitive values (${cdifNames.get(matrix.cdif)})`, (): void => {
			assert.equal(cdif.serialize(new CDIFInteger(42n, VER)), `42`);
			assert.equal(cdif.serialize(new CDIFString("foo".split(""), VER)), `"foo"`);
			assert.equal(cdif.serialize(new CDIFNull(VER)), `null`);
		});
	});

	{
		const cdif: CDIF = cdifs.default;
		test("Simple structures (default)", (): void => {
			assert.equal(cdif.serialize([]), `[]`);
			assert.equal(cdif.serialize({}), `{}`);
			assert.equal(cdif.serialize([1, "foo", true]), `[1., "foo", true]`);
			assert.equal(cdif.serialize({a: 1, b: "foo", c: true}), `{a: 1., b: "foo", c: true}`);
		});
	}

	{
		const cdif: CDIF = cdifs.pretty;
		test("Simple structures (pretty)", (): void => {
			assert.equal(cdif.serialize([]), `[]`);
			assert.equal(cdif.serialize({}), `{}`);
			assert.equal(cdif.serialize([1, "foo", true]), block(4, `
				[
					1.;
					"foo";
					true;
				]
			`));
			assert.equal(cdif.serialize({a: 1, b: "foo", c: true}), block(4, `
				{
					a: 1.;
					b: "foo";
					c: true;
				}
			`));
		});
	}

	{
		const cdif: CDIF = cdifs.default;
		test("Preprocessors and types (default)", (): void => {
			assert.equal(cdif.serialize({
				name: "Maddie",
				coolUsername: "m4dd1e",
				color: {red: 255, green: 51, blue: 153},
				items: ["egg", "fake \"bacon\""],
				ignore_field: "ignore this!",
				ignore_notReally: "don't ignore me",
				examplePreencoded: new CDIFCharacter("a", VER)
			}), fold(4, `
				{name: "Maddie",
				coolUsername: "Xx_m4dd1e_xX",
				color: Color {red: 255., green: 51., blue: 153.},
				items: ["egg", "fake \\"bacon\\""],
				ignore_notReally: "don't ignore me",
				examplePreencoded: 'a'}
			`));
		});
	}

	{
		const cdif: CDIF = cdifs.pretty;
		test("Preprocessors and types (pretty)", (): void => {
			assert.equal(cdif.serialize({
				name: "Maddie",
				coolUsername: "m4dd1e",
				color: {red: 255, green: 51, blue: 153},
				items: ["egg", "fake \"bacon\""],
				ignore_field: "ignore this!",
				ignore_notReally: "don't ignore me",
				examplePreencoded: new CDIFCharacter("a", VER)
			}), block(4, `
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
	}

});
