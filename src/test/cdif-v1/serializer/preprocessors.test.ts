import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {filterObjectProperties, useIntegers} from "../../../main/serializer/preprocessors.js";
import {block} from "@mkacct/ts-util/strings";

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

});
