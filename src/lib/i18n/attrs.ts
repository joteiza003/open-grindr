import type { MessageKey } from "./en";
import { t } from "./t";

export function localizeAttr(
	kind: string,
	id: number,
	fallback: string,
): string {
	const key = `attr.${kind}.${id}` as MessageKey;
	const translated = t(key);
	return translated === key ? fallback : translated;
}

export function localizeTable(
	kind: string,
	table: Record<number, string>,
): Record<number, string> {
	return Object.fromEntries(
		Object.entries(table).map(([id, fallback]) => [
			Number(id),
			localizeAttr(kind, Number(id), fallback),
		]),
	);
}

export function localizedOptions(kind: string, table: Record<number, string>) {
	return Object.entries(table).map(([value, fallback]) => ({
		value: Number(value),
		label: localizeAttr(kind, Number(value), fallback),
	}));
}

export function localizeServerLabel(
	prefix: "gender" | "pronoun" | "tag",
	text: string,
): string {
	const key = `${prefix}.${text}` as MessageKey;
	const translated = t(key);
	return translated === key ? text : translated;
}
