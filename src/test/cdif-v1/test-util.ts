export function reverseRecord<T>(record: Record<string, T>): Map<T, string> {
	return new Map(Object.entries(record).map(([key, value]: [string, T]): [T, string] => [value, key]));
}
