// tests independent of cDIF version

import {block} from "@mkacct/ts-util/strings";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../main/cdif.js";
import {CDIFDirectiveError} from "../main/errors.js";

suite("CDIF", (): void => {

	suite("constructor", (): void => {

		test("no options", (): void => {
			new CDIF();
		});

	});

	suite("static getCdifVersion()", (): void => {

		test("no directive", (): void => {
			assert.equal(CDIF.getCdifVersion(block(4, `
				"foo";
			`)), undefined);
		});

		test("correct usage", (): void => {
			assert.equal(CDIF.getCdifVersion(block(4, `
				# cDIF 1.0.2
				"foo";
			`)), 1);
			assert.equal(CDIF.getCdifVersion(block(4, `
				# cDIF 41.6.38
				"foo";
			`)), 41);
		});

		test("different directive", (): void => {
			assert.equal(CDIF.getCdifVersion(block(4, `
				# seediff 42.6.38
				"foo";
			`)), undefined);
		});

		test("incorrect usage", (): void => {
			assert.throws(() => CDIF.getCdifVersion(block(4, `
				# cDIF not_a_version
				"foo";
			`)), CDIFDirectiveError);
			assert.throws(() => CDIF.getCdifVersion(block(4, `
				# cDIF 6.
				"foo";
			`)), CDIFDirectiveError);
		});

	});

});
