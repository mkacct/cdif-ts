// tests the file formatter, assuming the serializer proper works fine

import {block} from "@mkacct/ts-util/strings";
import {matrixStrategy} from "@mkacct/ts-util/tests";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {reverseRecord} from "../../test-util.js";
import {VER} from "../context.js";

suite("v1 CDIF.serializeFile()", (): void => {

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
		suite(`primitive value (${cdifNames.get(matrix.cdif)})`, (): void => {

			test("default", (): void => {
				assert.equal(cdif.serializeFile(42), block(5, `
					42.

				`));
			});

			test("final semicolon", (): void => {
				assert.equal(cdif.serializeFile(42, {
					addFinalSemicolon: true
				}), block(5, `
					42.;

				`));
			});

			test("\"cDIF\" directive", (): void => {
				assert.equal(cdif.serializeFile(42, {
					cdifVersionString: "1.0.2",
					addFinalSemicolon: true
				}), block(5, `
					# cDIF 1.0.2
					42.;

				`));
			});

		});
	});

	suite("structure (default)", (): void => {

		const cdif: CDIF = cdifs.default;

		test("default", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3]), block(4, `
				[1., 2., 3.]

			`));
		});

		test("final semicolon", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], {
				addFinalSemicolon: true
			}), block(4, `
				[1., 2., 3.];

			`));
		});

		test("\"cDIF\" directive", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], {
				cdifVersionString: "1.0.2",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0.2
				[1., 2., 3.];

			`));
		});

	});

	suite("structure (pretty)", (): void => {

		const cdif: CDIF = cdifs.pretty;

		test("default", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3]), block(4, `
				[
					1.;
					2.;
					3.;
				]

			`));
		});

		test("final semicolon", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], {
				addFinalSemicolon: true
			}), block(4, `
				[
					1.;
					2.;
					3.;
				];

			`));
		});

		test("\"cDIF\" directive", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], {
				cdifVersionString: "1.0.2",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0.2
				[
					1.;
					2.;
					3.;
				];

			`));
		});

	});

	suite("version number validation", (): void => {

		const cdif: CDIF = cdifs.default;

		test("same major version", (): void => {
			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "1.0.2"
			}), block(4, `
				# cDIF 1.0.2
				null

			`));
			assert.equal(cdif.serializeFile(null, {
				cdifVersionString: "1.1"
			}), block(4, `
				# cDIF 1.1
				null

			`));
		});

		test("wrong major version", (): void => {
			assert.throws(() => cdif.serializeFile(null, {
				cdifVersionString: "2.0"
			}), Error);
		});

		test("invalid version string", (): void => {
			assert.throws(() => cdif.serializeFile(null, {
				cdifVersionString: "foo"
			}), Error);
		});

		test("allowing unexpected version", (): void => {
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

	});

});
