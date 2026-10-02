import type { MessagePreview } from "$lib/model/messaging/message-preview";
import type { ApiResponseMessage } from "$lib/model/messaging/messages";
import type { CachedConversation } from "./cached-conversation";

export const SEARCH_KINDS = [
	"all",
	"text",
	"media",
	"link",
	"location",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

const MEDIA_TYPES = new Set([
	"Image",
	"ExpiringImage",
	"Album",
	"ExpiringAlbum",
	"ExpiringAlbumV2",
	"Video",
	"PrivateVideo",
	"NonExpiringVideo",
]);
const LINK_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/i;
export const MAX_SEARCH_RESULTS = 100;

export type SearchableConversation = {
	conversationId: string;
	name: string | null;
	preview: MessagePreview | undefined;
	lastActivityTimestamp: number;
};

export type SearchResult = {
	conversationId: string;
	conversationName: string | null;
	messageId: string | null;
	kind: Exclude<SearchKind, "all"> | "other";
	text: string | null;
	timestamp: number;
	/** Viene de la vista previa del chat, no del historial cargado. */
	fromPreview: boolean;
};

/** Minúsculas y sin acentos, para que "cafe" encuentre "Café". */
export function normalizeForSearch(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function kindOfType(type: string, text: string | null): SearchResult["kind"] {
	if (type === "Text")
		return text !== null && LINK_PATTERN.test(text) ? "link" : "text";
	if (type === "Location") return "location";
	if (MEDIA_TYPES.has(type)) return "media";
	return "other";
}

function matchesKind(
	result: SearchResult["kind"],
	wanted: SearchKind,
): boolean {
	if (wanted === "all") return true;
	// Un enlace también es texto.
	if (wanted === "text") return result === "text" || result === "link";
	return result === wanted;
}

function textOf(message: ApiResponseMessage): string | null {
	return message.type === "Text" ? message.body.text : null;
}

/**
 * Busca en lo que hay en el dispositivo: el historial ya cargado de las
 * conversaciones abiertas en esta sesión y, para las demás, su vista previa.
 * No consulta al servidor.
 */
export function searchMessages({
	conversations,
	getCached,
	query,
	kind = "all",
	conversationId,
	limit = MAX_SEARCH_RESULTS,
}: {
	conversations: readonly SearchableConversation[];
	getCached: (id: string) => CachedConversation | undefined;
	query: string;
	kind?: SearchKind;
	/** Limita la búsqueda a una conversación. */
	conversationId?: string;
	limit?: number;
}): SearchResult[] {
	const needle = normalizeForSearch(query.trim());
	// Sin texto ni filtro no hay nada que buscar.
	if (needle === "" && kind === "all") return [];

	const results: SearchResult[] = [];
	const consider = (result: SearchResult) => {
		if (!matchesKind(result.kind, kind)) return;
		if (needle !== "") {
			if (result.text === null) return;
			if (!normalizeForSearch(result.text).includes(needle)) return;
		}
		results.push(result);
	};

	for (const conversation of conversations) {
		if (
			conversationId !== undefined &&
			conversation.conversationId !== conversationId
		) {
			continue;
		}
		const cached = getCached(conversation.conversationId);
		if (cached) {
			for (const message of cached.messages) {
				if (message.type === "Unsent") continue;
				const text = textOf(message);
				consider({
					conversationId: conversation.conversationId,
					conversationName: conversation.name,
					messageId: message.messageId,
					kind: kindOfType(message.type, text),
					text,
					timestamp: message.timestamp,
					fromPreview: false,
				});
			}
		} else if (
			conversation.preview &&
			conversation.preview.type !== "Unsent"
		) {
			const text = conversation.preview.text ?? null;
			consider({
				conversationId: conversation.conversationId,
				conversationName: conversation.name,
				messageId: null,
				kind: kindOfType(conversation.preview.type, text),
				text,
				timestamp: conversation.lastActivityTimestamp,
				fromPreview: true,
			});
		}
	}

	return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/** Parte un texto en antes / coincidencia / después, para resaltarla. */
export function splitAroundMatch({
	text,
	query,
	context = 40,
}: {
	text: string;
	query: string;
	context?: number;
}): { before: string; match: string; after: string } {
	const needle = normalizeForSearch(query.trim());
	// `normalize` puede cambiar la longitud; se busca carácter a carácter sin acentos.
	const plain = [...text].map((char) => normalizeForSearch(char)).join("");
	const index = needle === "" ? -1 : plain.indexOf(needle);
	if (index === -1 || plain.length !== text.length) {
		return { before: text.slice(0, context * 2), match: "", after: "" };
	}
	const end = index + needle.length;
	const start = Math.max(0, index - context);
	return {
		before: (start > 0 ? "…" : "") + text.slice(start, index),
		match: text.slice(index, end),
		after:
			text.slice(end, end + context) +
			(end + context < text.length ? "…" : ""),
	};
}
