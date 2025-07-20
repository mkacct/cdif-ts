// Suite "CDIF static utilities": tests static utility methods of the CDIF class (cdif.ts)

import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../main/cdif.js";
import {block} from "@mkacct/ts-util/strings";
import {CDIFDirectiveError} from "../main/errors.js";

suite("CDIF static utilities", (): void => {

	test("getCdifVersion", (): void => {
		assert.equal(CDIF.getCdifVersion(block(3, `
			"foo";
		`)), undefined);
		assert.equal(CDIF.getCdifVersion(block(3, `
			# cDIF 1.0.1
			"foo";
		`)), 1);
		assert.equal(CDIF.getCdifVersion(block(3, `
			# cDIF 41.6.38
			"foo";
		`)), 41);
		assert.equal(CDIF.getCdifVersion(block(3, `
			# seediff 42.6.38
			"foo";
		`)), undefined);

		assert.throws(() => CDIF.getCdifVersion(block(3, `
			# cDIF not_a_version
			"foo";
		`)), CDIFDirectiveError);
		assert.throws(() => CDIF.getCdifVersion(block(3, `
			# cDIF 6.
			"foo";
		`)), CDIFDirectiveError);
	});

});
