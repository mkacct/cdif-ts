// tests the included serializer preprocessors (preprocessors.ts), assuming the actual serializer works correctly

import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {SerializerPreprocessorFunction} from "../../../main/serializer/encoder.js";
import {
	assignType,
	filterObjectProperties,
	useIntegers,
	usePreprocessMethods
} from "../../../main/serializer/preprocessors.js";
import {SerializerOptions} from "../../../main/serializer/serializer.js";
import {VER} from "../context.js";

suite("v1 preprocessors", (): void => {

	const cdif = new CDIF(VER);

	const generalOptions: SerializerOptions = {
		indent: "\t",
		structureEntrySeparator: ";"
	};

	suite("filterObjectProperties()", (): void => {

		const options: SerializerOptions = {
			...generalOptions,
			preprocessors: [filterObjectProperties(["foo", "bar", "baz"])]
		};

		test("deep", (): void => {
			assert.equal(cdif.serialize({
				foo: "a",
				bar: ["b", "c", "d"],
				baz: {
					foo: "yes",
					garply: "no",
					baz: "yes too"
				},
				qux: "nope"
			}, options), block(4, `
				{
					foo: "a";
					bar: [
						"b";
						"c";
						"d";
					];
					baz: {
						foo: "yes";
						baz: "yes too";
					};
				}
			`));
		});

	});

	suite("useIntegers()", (): void => {

		const options: SerializerOptions = {
			...generalOptions,
			preprocessors: [useIntegers()]
		};

		test("numbers with fractional part unaffected", (): void => {
			assert.equal(cdif.serialize(42.125, options), `42.125`);
		});

		test("integers serialized as such", (): void => {
			assert.equal(cdif.serialize(42, options), `42`);
		});

		test("deep, with BigInt example", (): void => {
			assert.equal(cdif.serialize({
				a: 1,
				b: 2.5,
				c: 3n,
				d: [1, 2, 3]
			}, options), block(4, `
				{
					a: 1;
					b: 2.5;
					c: 3;
					d: [
						1;
						2;
						3;
					];
				}
			`));
		});

	});

	suite("assignType()", (): void => {

		const options: SerializerOptions = {
			...generalOptions,
			preprocessors: [
				assignType("Foo", ({key}) => {
					return key === "foo";
				}),
				assignType("Bar", ({value}) => {
					return "bar" in value;
				})
			]
		};

		test("primitives unaffected (they cannot have types)", (): void => {
			assert.equal(cdif.serialize({
				foo: 1
			}, options), block(4, `
				{
					foo: 1.;
				}
			`));
		});

		test("structures typed correctly", (): void => {
			assert.equal(cdif.serialize({
				foo: [1, 2]
			}, options), block(4, `
				{
					foo: Foo [
						1.;
						2.;
					];
				}
			`));
			assert.equal(cdif.serialize({
				thing: {
					bar: "asdf",
					other: "jkl;"
				},
				other: {
					foo: "nope"
				}
			}, options), block(4, `
				{
					thing: Bar {
						bar: "asdf";
						other: "jkl;";
					};
					other: {
						foo: "nope";
					};
				}
			`));
		});

	});

	suite("usePreprocessMethods()", (): void => {

		const options: SerializerOptions = {
			...generalOptions,
			preprocessors: [usePreprocessMethods()],
		};

		class NumberPlusTwoBox {
			readonly #value: number;

			public constructor(value: number) {
				this.#value = value;
			}

			public [CDIF.Symbol.preprocess]: SerializerPreprocessorFunction = () => {
				return {value: this.#value + 2};
			};
		}

		class Person {
			readonly #name: string;

			public constructor(name: string) {
				this.#name = name;
			}

			public [CDIF.Symbol.preprocess]: SerializerPreprocessorFunction = () => {
				return {type: "Person", value: {
					name: this.#name,
					lettersInName: this.#name.length,
					favoriteColor: (this.#name === "Maddie") ? "pink" : "idk"
				}};
			}
		}

		test("examples", (): void => {
			assert.equal(cdif.serialize({
				normalObj: {a: 1},
				normalArr: [true],
				foo: new NumberPlusTwoBox(3),
				bar: new Person("Maddie"),
				baz: new Person("Jim")
			}, options), block(4, `
				{
					normalObj: {
						a: 1.;
					};
					normalArr: [
						true;
					];
					foo: 5.;
					bar: Person {
						name: "Maddie";
						lettersInName: 6.;
						favoriteColor: "pink";
					};
					baz: Person {
						name: "Jim";
						lettersInName: 3.;
						favoriteColor: "idk";
					};
				}
			`));
		});

	});

});
