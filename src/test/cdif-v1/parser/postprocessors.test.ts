// Suite "Included parser postprocessors": tests the included postprocessors (postprocessors.ts),
// assuming the actual parser works correctly

import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {postprocessType} from "../../../main/parser/postprocessors.js";

suite("Included parser postprocessors", (): void => {

	const VER: number = 1;

	{
		const cdif = new CDIF({cdifVersion: VER, parser: {
			postprocessors: [postprocessType("Color", ({value}) => {
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
			})]
		}});

		test("postprocessType", (): void => {
			assert.deepEqual(cdif.parse(block(4, `
				[
					Color {red: 255, green: 6, blue: 0},
					NotColor {red: 0, green: 255, blue: 0}
				]
			`)), [
				"#ff0600",
				{red: 0, green: 255, blue: 0}
			]);
		});
	}

});
