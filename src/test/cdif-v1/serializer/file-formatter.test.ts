// tests the file formatter, assuming the serializer proper works fine

import {block} from "@mkacct/ts-util/strings";
import {matrixStrategy} from "@mkacct/ts-util/tests";
import assert from "node:assert/strict";
import test, {suite} from "node:test";
import CDIF from "../../../main/cdif.js";
import {SerializerOptions} from "../../../main/serializer/serializer.js";
import {reverseRecord} from "../../test-util.js";
import {VER} from "../context.js";

suite("v1 CDIF.serializeFile()", (): void => {

	const cdif = new CDIF(VER);

	const optionsObjs: Record<string, SerializerOptions> = {
		default: {},
		pretty: {
			indent: "\t",
			structureEntrySeparator: ";"
		}
	};

	const optionsNames: Map<SerializerOptions, string> = reverseRecord(optionsObjs);

	matrixStrategy({options: Object.values(optionsObjs)}, (matrix): void => {
		suite(`primitive value (${optionsNames.get(matrix.options)})`, (): void => {

			test("default", (): void => {
				assert.equal(cdif.serializeFile(42, matrix.options), block(5, `
					42.

				`));
			});

			test("final semicolon", (): void => {
				assert.equal(cdif.serializeFile(42, matrix.options, {
					addFinalSemicolon: true
				}), block(5, `
					42.;

				`));
			});

			test("\"cDIF\" directive", (): void => {
				assert.equal(cdif.serializeFile(42, matrix.options, {
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

		test("default", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.default), block(4, `
				[1., 2., 3.]

			`));
		});

		test("final semicolon", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.default, {
				addFinalSemicolon: true
			}), block(4, `
				[1., 2., 3.];

			`));
		});

		test("\"cDIF\" directive", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.default, {
				cdifVersionString: "1.0.2",
				addFinalSemicolon: true
			}), block(4, `
				# cDIF 1.0.2
				[1., 2., 3.];

			`));
		});

	});

	suite("structure (pretty)", (): void => {

		test("default", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.pretty), block(4, `
				[
					1.;
					2.;
					3.;
				]

			`));
		});

		test("final semicolon", (): void => {
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.pretty, {
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
			assert.equal(cdif.serializeFile([1, 2, 3], optionsObjs.pretty, {
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

		test("same major version", (): void => {
			assert.equal(cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "1.0.2"
			}), block(4, `
				# cDIF 1.0.2
				null

			`));
			assert.equal(cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "1.1"
			}), block(4, `
				# cDIF 1.1
				null

			`));
		});

		test("wrong major version", (): void => {
			assert.throws(() => cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "2.0"
			}), Error);
		});

		test("invalid version string", (): void => {
			assert.throws(() => cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "foo"
			}), Error);
		});

		test("allowing unexpected version", (): void => {
			assert.equal(cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "2.0",
				allowUnexpectedVersionString: true
			}), block(4, `
				# cDIF 2.0
				null

			`));
			assert.equal(cdif.serializeFile(null, optionsObjs.default, {
				cdifVersionString: "foo",
				allowUnexpectedVersionString: true
			}), block(4, `
				# cDIF foo
				null

			`));
		});

	});

});
