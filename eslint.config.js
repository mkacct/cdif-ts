import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"eqeqeq": ["error", "always"],
			"@typescript-eslint/explicit-member-accessibility": "error",
			"prefer-const": "off",
			"no-unused-private-class-members": "warn",
			"@typescript-eslint/no-empty-object-type": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", {
				argsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_"
			}]
		}
	},
	{
		ignores: ["build/"]
	}
);
