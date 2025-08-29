// Suite "General": tests miscellaneous version-independent behaviors

import test, {suite} from "node:test";
import CDIF from "../main/cdif.js";

suite("General", (): void => {

	test("New CDIF with no options", (): void => {
		new CDIF();
	});

});
