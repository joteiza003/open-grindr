const encoder = new TextEncoder();

export function byteLength(text: string): number {
	return encoder.encode(text).length;
}

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

/** Providers sometimes return HTML entities (`&#39;`); decode the common ones. */
export function decodeEntities(text: string): string {
	return text.replace(
		/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
		(match, body: string) => {
			if (body[0] === "#") {
				const code =
					body[1]?.toLowerCase() === "x"
						? Number.parseInt(body.slice(2), 16)
						: Number.parseInt(body.slice(1), 10);
				return Number.isFinite(code) && code > 0 && code <= 0x10ffff
					? String.fromCodePoint(code)
					: match;
			}
			return ENTITIES[body.toLowerCase()] ?? match;
		},
	);
}

export type Piece = { text: string; joiner: string };

/**
 * Split text into pieces of at most `maxBytes` UTF-8 bytes, breaking on line
 * breaks first, then sentence ends, then spaces, and finally mid-word. Each
 * piece remembers the separator that followed it so the translation can be
 * reassembled with the original layout.
 */
export function chunkText(text: string, maxBytes: number): Piece[] {
	const pieces: Piece[] = [];
	const lines = text.split(/(\n+)/);
	for (let i = 0; i < lines.length; i += 2) {
		const line = lines[i] ?? "";
		const newline = lines[i + 1] ?? "";
		if (line.trim() === "") {
			if (pieces.length > 0) {
				const last = pieces[pieces.length - 1] as Piece;
				last.joiner += line + newline;
			}
			continue;
		}
		const parts = splitLine(line, maxBytes);
		parts.forEach((part, index) => {
			pieces.push({
				text: part,
				joiner: index === parts.length - 1 ? newline : " ",
			});
		});
	}
	return pieces;
}

function splitLine(line: string, maxBytes: number): string[] {
	const trimmed = line.trim();
	if (byteLength(trimmed) <= maxBytes) return [trimmed];
	const sentences = trimmed.split(/(?<=[.!?…。！？])\s+/);
	const out: string[] = [];
	let current = "";
	const flush = () => {
		if (current !== "") out.push(current);
		current = "";
	};
	for (const sentence of sentences) {
		for (const fragment of splitLong(sentence, maxBytes)) {
			const candidate =
				current === "" ? fragment : `${current} ${fragment}`;
			if (byteLength(candidate) <= maxBytes) current = candidate;
			else {
				flush();
				current = fragment;
			}
		}
	}
	flush();
	return out;
}

/** Break a single over-long sentence on spaces, then by code point. */
function splitLong(sentence: string, maxBytes: number): string[] {
	if (byteLength(sentence) <= maxBytes) return [sentence];
	const out: string[] = [];
	let current = "";
	for (const word of sentence.split(/\s+/)) {
		for (const piece of splitByCodePoint(word, maxBytes)) {
			const candidate = current === "" ? piece : `${current} ${piece}`;
			if (byteLength(candidate) <= maxBytes) current = candidate;
			else {
				if (current !== "") out.push(current);
				current = piece;
			}
		}
	}
	if (current !== "") out.push(current);
	return out;
}

function splitByCodePoint(word: string, maxBytes: number): string[] {
	if (byteLength(word) <= maxBytes) return [word];
	const out: string[] = [];
	let current = "";
	for (const char of word) {
		if (byteLength(current + char) > maxBytes) {
			out.push(current);
			current = "";
		}
		current += char;
	}
	if (current !== "") out.push(current);
	return out;
}

/** True when there is nothing worth translating (empty, digits, emoji, punctuation). */
export function isTranslatable(text: string): boolean {
	return /\p{L}{2,}/u.test(text);
}
