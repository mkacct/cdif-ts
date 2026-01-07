import {block} from "@mkacct/ts-util/strings";

export function oneLine(indent: number, str: string): string {
	return block(indent, str).replace(/\n/g, "");
}

export function reverseRecord<T>(record: Record<string, T>): Map<T, string> {
	return new Map(Object.entries(record).map(([key, value]: [string, T]): [T, string] => [value, key]));
}
