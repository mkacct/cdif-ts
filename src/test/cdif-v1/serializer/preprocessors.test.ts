import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {SerializerPreprocessorFunction} from "../../../main/serializer/encoder.js";
import {assignType, filterObjectProperties, useIntegers, usePreprocessMethods} from "../../../main/serializer/preprocessors.js";

suite("Included serializer preprocessors", (): void => {

	const VER: number = 1;

	{
		const cdif = new CDIF({cdifVersion: VER, serializer: {
			preprocessors: [filterObjectProperties(["foo", "bar", "baz"])],
			indent: "\t",
			structureEntrySeparator: ";"
		}});

		test("filterObjectProperties", (): void => {
			assert.equal(cdif.serialize({
				foo: "a",
				bar: ["b", "c", "d"],
				baz: {
					foo: "yes",
					garply: "no",
					baz: "yes too"
				},
				qux: "nope"
			}), block(4, `
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
	}

	{
		const cdif = new CDIF({cdifVersion: VER, serializer: {
			preprocessors: [useIntegers()],
			indent: "\t",
			structureEntrySeparator: ";"
		}});

		test("useIntegers", (): void => {
			assert.equal(cdif.serialize(42.125), `42.125`);
			assert.equal(cdif.serialize(42), `42`);
			assert.equal(cdif.serialize({
				a: 1,
				b: 2.5,
				c: 3n,
				d: [1, 2, 3]
			}), block(4, `
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
	}

	{
		const cdif = new CDIF({cdifVersion: VER, serializer: {
			preprocessors: [
				assignType("Foo", ({key}) => {
					return key === "foo";
				}),
				assignType("Bar", ({value}) => {
					return "bar" in value;
				})
			],
			indent: "\t",
			structureEntrySeparator: ";"
		}});

		test("assignType", (): void => {
			assert.equal(cdif.serialize({ // primitives cannot have types
				foo: 1
			}), block(4, `
				{
					foo: 1.;
				}
			`));
			assert.equal(cdif.serialize({
				foo: [1, 2]
			}), block(4, `
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
			}), block(4, `
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
	}

	{
		const cdif = new CDIF({cdifVersion: VER, serializer: {
			preprocessors: [usePreprocessMethods()],
			indent: "\t",
			structureEntrySeparator: ";"
		}});

		class NumberPlusTwoBox {
			public constructor(private readonly value: number) {}

			public [CDIF.Symbol.preprocess]: SerializerPreprocessorFunction = () => {
				return {value: this.value + 2};
			};
		}

		class Person {
			public constructor(private readonly name: string) {}

			public [CDIF.Symbol.preprocess]: SerializerPreprocessorFunction = () => {
				return {type: "Person", value: {
					name: this.name,
					lettersInName: this.name.length,
					favoriteColor: (this.name === "Maddie") ? "pink" : "idk"
				}};
			}
		}

		test("usePreprocessMethods", (): void => {
			assert.equal(cdif.serialize({
				normalObj: {a: 1},
				normalArr: [true],
				foo: new NumberPlusTwoBox(3),
				bar: new Person("Maddie"),
				baz: new Person("Jim")
			}), block(4, `
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
	}

});
