// tests the included parser postprocessors (postprocessors.ts), assuming the actual parser works correctly

import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {ParserOptions} from "../../../main/parser/parser.js";
import {
	postprocessType
} from "../../../main/parser/postprocessors.js";
import {VER} from "../context.js";

suite("v1 postprocessors", (): void => {

	const cdif = new CDIF(VER);

	suite("postprocessType()", (): void => {

		const options: ParserOptions = {
			postprocessors: [
				postprocessType("Color", ({value}) => {
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
				})
			]
		};

		test("example", (): void => {
			assert.deepEqual(cdif.parse(block(4, `
				[
					Color {red: 255, green: 6, blue: 0},
					NotColor {red: 0, green: 255, blue: 0}
				]
			`), options), [
				"#ff0600",
				{red: 0, green: 255, blue: 0}
			]);
		});

	});


});
