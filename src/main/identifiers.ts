const NAME_REGEX: RegExp = /^[\p{L}_][\p{L}\d$_]*$/us;

const RESERVED_NAMES: readonly string[] = [
	"infinity",
	"true", "false",
	"null",
	"undef"
];

/**
 * @param name
 * @returns true iff `name` is a valid cDIF name (for object properties, etc.)
 * @note don't use this for type identifiers; they have additional restrictions
 */
export function isValidName(name: string): boolean {
	return NAME_REGEX.test(name);
}

/**
 * @param name
 * @returns true iff `name` is a valid cDIF type identifier
 */
export function isValidTypeId(name: string): boolean {
	return !RESERVED_NAMES.includes(name) && isValidName(name);
}
