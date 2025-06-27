import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../main/cdif.js";
import {block} from "@mkacct/ts-util/strings";
import {reverseRecord} from "./test-util.js";
import {matrixStrategy} from "@mkacct/ts-util/tests";
import {CDIFError} from "../../main/errors.js";

suite("CDIF.serialize", (): void => {

	const VER: number = 1;

	const cdifs: Record<string, CDIF> = {
		default: new CDIF({cdifVersion: VER}),
		pretty: new CDIF({cdifVersion: VER, serializer: {
			indent: "\t",
			structureEntrySeparator: ";"
		}})
	};

	const cdifNames: Map<CDIF, string> = reverseRecord(cdifs);

	matrixStrategy({cdif: Object.values(cdifs)}, (matrix): void => {
		const cdif: CDIF = matrix.cdif;
		test(`Primitive value (${cdifNames.get(matrix.cdif)})`, (): void => {
			assert.equal(cdif.serializeFile(42), block(4, `
				42.
			`));
			assert.equal(cdif.serializeFile(42, {
				addFinalSemicolon: true
			}), block(4, `
				42.;
			`));
			assert.equal(cdif.serializeFile(42, {
				cdifVersionString: "1.0",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0
				42.;
			`));
		});
	});

	{
		const cdif: CDIF = cdifs.default;
		test("Structure (default)", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3]), block(4, `
				[1., 2., 3.]
			`));
			assert.equal(cdif.serializeFile([1, 2, 3], {
				addFinalSemicolon: true
			}), block(4, `
				[1., 2., 3.];
			`));
			assert.equal(cdif.serializeFile([1, 2, 3], {
				cdifVersionString: "1.0",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0
				[1., 2., 3.];
			`));
		});
	}

	{
		const cdif: CDIF = cdifs.pretty;
		test("Structure (pretty)", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3]), block(4, `
				[
					1.;
					2.;
					3.;
				]
			`));
			assert.equal(cdif.serializeFile([1, 2, 3], {
				addFinalSemicolon: true
			}), block(4, `
				[
					1.;
					2.;
					3.;
				];
			`));
			assert.equal(cdif.serializeFile([1, 2, 3], {
				cdifVersionString: "1.0",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0
				[
					1.;
					2.;
					3.;
				];
			`));
		});
	}

	{
		const cdif: CDIF = cdifs.default;
		test("Version number validation", (): void => {
			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "1.0"
			}), block(4, `
				# cDIF 1.0
				null
			`));
			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "1.1"
			}), block(4, `
				# cDIF 1.1
				null
			`));

			assert.throws((): void => {
				cdif.serializeFile(null, {
					cdifVersionString: "2.0"
				});
			}, CDIFError);
			assert.throws((): void => {
				cdif.serializeFile(null, {
					cdifVersionString: "foo"
				});
			}, CDIFError);

			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "2.0",
				allowUnexpectedVersionString: true
			}), block(4, `
				# cDIF 2.0
				null
			`));
			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "foo",
				allowUnexpectedVersionString: true
			}), block(4, `
				# cDIF foo
				null
			`));
		});
	}

});
