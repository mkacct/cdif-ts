import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../main/cdif.js";
import {CDIFSyntaxError} from "../../main/errors.js";

suite("CDIF.createPrimitiveValue", (): void => {

	const VER: number = 1;

	const cdif: CDIF = new CDIF({cdifVersion: VER});

	test("Nonsense", (): void => {
		assert.throws(() => {cdif.createPrimitiveValue("");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("foo");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("NaN");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("undef");}, CDIFSyntaxError);
	});

	test("Integer", (): void => {
		assert.equal(cdif.createPrimitiveValue("0").cdifText, "0");
		assert.equal(cdif.createPrimitiveValue("1").cdifText, "1");
		assert.equal(cdif.createPrimitiveValue("-1").cdifText, "-1");
		assert.equal(cdif.createPrimitiveValue("+1").cdifText, "1");
		assert.equal(cdif.createPrimitiveValue("356987436758642598743323").cdifText, "356987436758642598743323");
		assert.equal(cdif.createPrimitiveValue("-156987436758642598743323").cdifText, "-156987436758642598743323");
		assert.equal(cdif.createPrimitiveValue("+256987436758642598743323").cdifText, "256987436758642598743323");
		assert.equal(cdif.createPrimitiveValue("123_456_789").cdifText, "123456789");
		assert.equal(cdif.createPrimitiveValue("+1_2345_6_7_89").cdifText, "123456789");
		assert.throws(() => {cdif.createPrimitiveValue("4_");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("_4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("-_3");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("0642").cdifText, "642");
		assert.equal(cdif.createPrimitiveValue("-0000").cdifText, "0");
		assert.equal(cdif.createPrimitiveValue("-000033").cdifText, "-33");

		assert.equal(cdif.createPrimitiveValue("0b101").cdifText, "5");
		assert.equal(cdif.createPrimitiveValue("0B101").cdifText, "5");
		assert.throws(() => {cdif.createPrimitiveValue("0b102");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("0o111").cdifText, "73");
		assert.equal(cdif.createPrimitiveValue("0o77").cdifText, "63");
		assert.equal(cdif.createPrimitiveValue("0O77").cdifText, "63");
		assert.throws(() => {cdif.createPrimitiveValue("0o80");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("0x11").cdifText, "17");
		assert.equal(cdif.createPrimitiveValue("-0x11").cdifText, "-17");
		assert.equal(cdif.createPrimitiveValue("+0x1_1").cdifText, "17");
		assert.equal(cdif.createPrimitiveValue("0x1a").cdifText, "26");
		assert.equal(cdif.createPrimitiveValue("0x1A").cdifText, "26");
		assert.equal(cdif.createPrimitiveValue("0x1F").cdifText, "31");
		assert.equal(cdif.createPrimitiveValue("0X1F").cdifText, "31");
		assert.equal(cdif.createPrimitiveValue("0x31_a5_B9_94").cdifText, "832944532");
		assert.throws(() => {cdif.createPrimitiveValue("0x_2");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0x1g");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0x1G");}, CDIFSyntaxError);

		assert.throws(() => {cdif.createPrimitiveValue("0b");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0o");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0x");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0-x11");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0x-11");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("3e5");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1x11");}, CDIFSyntaxError);
	});

	test("Float", (): void => {
		assert.throws(() => {cdif.createPrimitiveValue(".");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("0.").cdifText, "0.");
		assert.equal(cdif.createPrimitiveValue("0.0").cdifText, "0.");
		assert.equal(cdif.createPrimitiveValue("0000.00000e+00000").cdifText, "0.");
		assert.equal(cdif.createPrimitiveValue("1.3").cdifText, "1.3");
		assert.equal(cdif.createPrimitiveValue("1.3e4").cdifText, "1.3e4");
		assert.equal(cdif.createPrimitiveValue("1.3e+4").cdifText, "1.3e4");
		assert.equal(cdif.createPrimitiveValue("1.3e-4").cdifText, "1.3e-4");
		assert.equal(cdif.createPrimitiveValue("5832798740932741.32413297493274949323e3214713294873294732").cdifText, "5832798740932741.32413297493274949323e3214713294873294732");
		assert.throws(() => {cdif.createPrimitiveValue("-.e7");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("-.4e7").cdifText, "-0.4e7");
		assert.equal(cdif.createPrimitiveValue("-.4e-7").cdifText, "-0.4e-7");
		assert.throws(() => {cdif.createPrimitiveValue("1e7.");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1e.7");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0x1.");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0b.1");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("0o1e1");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue(".e3");}, CDIFSyntaxError);

		assert.equal(cdif.createPrimitiveValue("-1_2.3_4e+5_6").cdifText, "-12.34e56");
		assert.equal(cdif.createPrimitiveValue("123_456_789.123_456e123_456").cdifText, "123456789.123456e123456");
		assert.throws(() => {cdif.createPrimitiveValue("_1.2e4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1_.2e4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1._2e4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1.2_e4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1.2e_4");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("1.2e4_");}, CDIFSyntaxError);
	});

	test("Infinite", (): void => {
		assert.equal(cdif.createPrimitiveValue("infinity").cdifText, "infinity");
		assert.equal(cdif.createPrimitiveValue("-infinity").cdifText, "-infinity");
		assert.equal(cdif.createPrimitiveValue("+infinity").cdifText, "infinity");

		assert.throws(() => {cdif.createPrimitiveValue("Infinity");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("INFINITY");}, CDIFSyntaxError);
	});

	test("Character", (): void => {
		assert.equal(cdif.createPrimitiveValue("'a'").cdifText, "'a'");
		assert.equal(cdif.createPrimitiveValue("'~'").cdifText, "'~'");
		assert.throws(() => {cdif.createPrimitiveValue("'\n'");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("'😊'").cdifText, "'😊'");
		assert.throws(() => {cdif.createPrimitiveValue("'🏳️‍⚧️'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'ab'");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("'\"'").cdifText, "'\"'");
		assert.equal(cdif.createPrimitiveValue("'/'").cdifText, "'/'");
		assert.throws(() => {cdif.createPrimitiveValue("'\\'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("''");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'''");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'n\\'");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("'\\n'").cdifText, "'\\n'");
		assert.equal(cdif.createPrimitiveValue("'\\\"'").cdifText, "'\"'");
		assert.equal(cdif.createPrimitiveValue("'\\''").cdifText, "'\\''");
		assert.equal(cdif.createPrimitiveValue("'\\\\'").cdifText, "'\\\\'");
		assert.equal(cdif.createPrimitiveValue("'\\/'").cdifText, "'/'");
		assert.throws(() => {cdif.createPrimitiveValue("'\\\\\\'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\N'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\q'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\u'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\U'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\n1a32'");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("'\\u1a32'").cdifText, "'\\u1a32'");
		assert.throws(() => {cdif.createPrimitiveValue("'\\u1g32'");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("'\\u1a325555'");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("'\\U1a3292f4'").cdifText, "'\\U1a3292f4'");
		assert.throws(() => {cdif.createPrimitiveValue("'\\U1a32'");}, CDIFSyntaxError);
	});

	test("String (standard)", (): void => {
		assert.equal(cdif.createPrimitiveValue("\"\"").cdifText, "\"\"");
		assert.equal(cdif.createPrimitiveValue("\"a\"").cdifText, "\"a\"");
		assert.equal(cdif.createPrimitiveValue("\"Hello, world!\"").cdifText, "\"Hello, world!\"");
		assert.equal(cdif.createPrimitiveValue("\"Hello\\nWorld\"").cdifText, "\"Hello\\nWorld\"");
		assert.throws(() => {cdif.createPrimitiveValue("\"Hello\nWorld\"");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("\"Emojis: 😊❤️\"").cdifText, "\"Emojis: 😊❤️\"");
		assert.throws(() => {cdif.createPrimitiveValue("\"Contains ZWJ: 🏳️‍⚧️\"");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("\"3\\/4 cup\\tflower with \\\"all\\\" \\'natural\\' tests/cases\"").cdifText, "\"3/4 cup\\tflower with \\\"all\\\" 'natural' tests/cases\"");
		assert.equal(cdif.createPrimitiveValue("\"unicode \\u1f3e and \\U99887766 chars\"").cdifText, "\"unicode \\u1f3e and \\U99887766 chars\"");
		assert.throws(() => {cdif.createPrimitiveValue("\"Bad char code: \\u109g\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"Unfinished char code: \\u109\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"Bad char code: \\U108223 \"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"Unfinished char code: \\U1082239\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"You can't just say \"perchance\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"foo");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("foo\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"\"foo\"");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("\"foo\"\"");}, CDIFSyntaxError);
	});

	test("String (verbatim)", (): void => {
		assert.equal(cdif.createPrimitiveValue("``").cdifText, "\"\"");
		assert.equal(cdif.createPrimitiveValue("`a`").cdifText, "\"a\"");
		assert.equal(cdif.createPrimitiveValue("`Hello, world!`").cdifText, "\"Hello, world!\"");
		assert.equal(cdif.createPrimitiveValue("`Hello\\nWorld`").cdifText, "\"Hello\\\\nWorld\"");
		assert.equal(cdif.createPrimitiveValue("`C:\\Users`").cdifText, "\"C:\\\\Users\"");
		assert.throws(() => {cdif.createPrimitiveValue("`Hello\nWorld`");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("`Emojis: 😊❤️`").cdifText, "\"Emojis: 😊❤️\"");
		assert.throws(() => {cdif.createPrimitiveValue("`Contains ZWJ: 🏳️‍⚧️`");}, CDIFSyntaxError);
		assert.equal(cdif.createPrimitiveValue("`\\n\\t\\u\\\"\\'/`").cdifText, "\"\\\\n\\\\t\\\\u\\\\\\\"\\\\'/\"");
		assert.throws(() => {cdif.createPrimitiveValue("`the`problem`");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("`");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("`foo");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("foo`");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("``foo`");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("`foo``");}, CDIFSyntaxError);
	});

	test("String (block)", (): void => {
		assert.equal(cdif.createPrimitiveValue("\"\"\"\"\"\"").cdifText, "\"\"");
		assert.equal(cdif.createPrimitiveValue("\"\"\"foo\"\"\"").cdifText, "\"foo\"");
		assert.equal(cdif.createPrimitiveValue("\"\"\"foo\nbar\"\"\"").cdifText, "\"foo\\nbar\"");
		assert.equal(cdif.createPrimitiveValue("\"\"\"foo\nbar\nbaz\"\"\"").cdifText, "\"foo\\nbar\\nbaz\"");
		assert.equal(cdif.createPrimitiveValue(
			"\"\"\"\n\tfunction foo() {\n\t\treturn \"hi\";\n\t}\n\n\tlet bar = \"\\u0048ello \\\n\tworld\";\n\"\"\"").cdifText,
			"\"function foo() {\\n\\treturn \\\"hi\\\";\\n}\\n\\nlet bar = \\\"\\u0048ello world\\\";\""
		);
	});

	// TODO: more thorough tests of block strings is probably needed

	test("Boolean", (): void => {
		assert.equal(cdif.createPrimitiveValue("true").cdifText, "true");
		assert.equal(cdif.createPrimitiveValue("false").cdifText, "false");

		assert.throws(() => {cdif.createPrimitiveValue("True");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("False");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("TRUE");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("FALSE");}, CDIFSyntaxError);
	});

	test("Null", (): void => {
		assert.equal(cdif.createPrimitiveValue("null").cdifText, "null");

		assert.throws(() => {cdif.createPrimitiveValue("Null");}, CDIFSyntaxError);
		assert.throws(() => {cdif.createPrimitiveValue("NULL");}, CDIFSyntaxError);
	});

});
