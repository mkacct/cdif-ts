// tests the whole parser

import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {CDIFDirectiveError, CDIFReferenceError, CDIFSyntaxError, CDIFTypeError} from "../../../main/errors.js";
import {VER} from "../context.js";

suite("v1 CDIF.parse()", (): void => {

	const cdif: CDIF = new CDIF({cdifVersion: VER, parser: {
		postprocessors: [
			({type, value}) => {
				if (type === "Color") {
					if (
						("red" in value) && (typeof value.red === "number")
						&& ("green" in value) && (typeof value.green === "number")
						&& ("blue" in value) && (typeof value.blue === "number")
					) {
						return {value: "#"
							+ value.red.toString(16).padStart(2, "0")
							+ value.green.toString(16).padStart(2, "0")
							+ value.blue.toString(16).padStart(2, "0")
						};
					}
					throw new Error(`bad color!!!`);
				}
			}
		]
	}});

	test("simple primitive", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			"Foo"
		`)), "Foo");
	});

	test("\"cDIF\" directive", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			# cDIF 1.0.2
			3;
		`)), 3);
	});

	test("\"cDIF\" directive; wrong major version", (): void => {
		assert.throws(() => cdif.parse(block(3, `
			# cDIF 2.0
			3;
		`)), CDIFDirectiveError);
	});

	test("primitive values and comments", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			[ // hello
				true,
				false, // world
				633,
				42.6e-1,
				1.,
				.1,
				"", // empty string
				"foo\\tbar",
				\`foo\\tbar\`, /* oh hi
				still in the comment
				now out of comment */ null,
				'😊',
				0xCAB,
				"""
					once upon a time
					there was a "multiline string"
					yeah \\U0001F4A9
				""",
				"""""i have too much """"quotes"""" in me""""",
				\`\`\`\`
					i'm a verbatim block string
					look at my \`\`\`backslash\`\`\`: \\n
				\`\`\`\`,
				-infinity
			]
		`)), [
			true,
			false,
			633,
			4.26,
			1,
			0.1,
			"",
			"foo\tbar",
			"foo\\tbar",
			null,
			"😊",
			3243,
			block(4, `
				once upon a time
				there was a "multiline string"
				yeah 💩
			`),
			`i have too much """"quotes"""" in me`,
			block(4, `
				i'm a verbatim block string
				look at my \`\`\`backslash\`\`\`: \\n
			`),
			-Infinity
		]);
	});

	test("object behaviors", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			{
				foo: "one";
				bar: undef;
				baz: "two";
				color: Color {red: 255, green: 51, blue: 152};
				untypedColor: {red: 255, green: 51, blue: 152};
			}
		`)), {
			foo: "one",
			baz: "two",
			color: "#ff3398",
			untypedColor: {red: 255, green: 51, blue: 152}
		});
	});

	test("one-line concise values", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			Thing{foo:12,bar:0o11,baz:+1.2e-1,idk:undef,qux:[true,{a:$a},...$items,],color:Color{red:1,green:2,blue:3}}
			# components
			{a:3,items:['c';"asdf";"""1"2"3""";\`"\`]}
		`)), {
			foo: 12,
			bar: 9,
			baz: 0.12,
			qux: [
				true,
				{a: 3},
				"c",
				"asdf",
				`1"2"3`,
				`"`
			],
			color: "#010203"
		});
	});

	test("example from specification", (): void => {
		assert.deepEqual(cdif.parse(block(3, `
			# cDIF 1.0.2
			{
				name: $myName;
				displayColor: $hotPink;
				items: ["hat", ...$defaultItems, $specialItem];
				stats: {
					atk: 5;
					...$defaultStats;
					def: 3;
					crv: 19;
				};
			};

			# components
			{
				myName: "Maddie";
				hotPink: Color {red: $maxByte, green: 51, blue: 153};
				defaultItems: ItemList ["phone", "wallet", "keys"];
				defaultStats: {atk: 1, def: 1, hp: 20};
				specialItem: "cake";
				maxByte: 255;
			};
		`)), {
			name: "Maddie",
			displayColor: "#ff3399",
			items: ["hat", "phone", "wallet", "keys", "cake"],
			stats: {
				atk: 1,
				def: 3,
				hp: 20,
				crv: 19
			}
		});
	});

	suite("directive errors", (): void => {

		test("empty directive", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				#
				"foo";
			`)), CDIFSyntaxError);
		});

		test("unrecognized directive", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				# thisWillNeverBeARealDirectiveName
				"foo";
			`)), CDIFDirectiveError);
		});

		test("\"cDIF\" directive not at top", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				"foo";
				# cDIF 1.0.2
			`)), CDIFDirectiveError);
		});

		test("duplicate \"components\" directive", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				"foo";
				# components
				{}
				# components
				{}
			`)), CDIFDirectiveError);
		});

	});

	suite("components section errors", (): void => {

		test("must be structure", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				"foo";
				# components
				"foo";
			`)), CDIFSyntaxError);
		});

		test("top level cannot have type identifier", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				"foo";
				# components
				WrongPlaceForATypeName {};
			`)), CDIFSyntaxError);
		});

		test("top level cannot use spread operator", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				"foo";
				# components
				{
					a: {};
					...$a;
				}
			`)), CDIFSyntaxError);
		});

	});

	suite("evaluator errors", (): void => {

		test("no such component", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				$a;
				# components
				{}
			`)), CDIFReferenceError);
		});

		test("spread must be into same type of structure", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				{
					...$a;
				}
				# components
				{
					a: [1, 2, 3];
				}
			`)), CDIFTypeError);
			assert.throws(() => cdif.parse(block(4, `
				[
					...$a;
				]
				# components
				{
					a: {x: 1, y: 2};
				}
			`)), CDIFTypeError);
		});

	});

	suite("circular reference detection", (): void => {

		test("duplicate and chained reference, but no circular reference", (): void => {
			assert.deepEqual(cdif.parse(block(4, `
				{
					a: $a;
					b: $a;
				}
				#components
				{
					a: $c;
					c: 1
				}
			`)), {
				a: 1,
				b: 1
			});
		});

		test("circular reference", (): void => {
			assert.throws(() => cdif.parse(block(4, `
				{
					a: $b;
				}
				#components
				{
					b: $c;
					c: $b;
				}
			`)), CDIFReferenceError);
		});

	});

});
