import { baseLanguage } from "./languages";
import { chunkText, decodeEntities } from "./text";

export type TranslateRequest = {
	text: string;
	/** Source language code, or "auto" to let the provider detect it. */
	from: string;
	to: string;
	/** Language to assume when detection is inconclusive (short drafts). */
	fallbackFrom?: string;
};

export type ProviderResult = { text: string; detected?: string };

export type TranslateErrorCode =
	| "quota"
	| "network"
	| "bad-response"
	| "unsupported"
	| "model-missing"
	| "aborted";

export class TranslateError extends Error {
	readonly code: TranslateErrorCode;

	constructor(code: TranslateErrorCode, message: string) {
		super(message);
		this.name = "TranslateError";
		this.code = code;
	}
}

export type Provider = {
	id: string;
	translate(
		request: TranslateRequest,
		context?: { signal?: AbortSignal },
	): Promise<ProviderResult>;
};

type FetchLike = (
	input: string,
	init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const REQUEST_TIMEOUT_MS = 10_000;
/** MyMemory rejects queries over 500 bytes; stay safely under it. */
const MAX_PIECE_BYTES = 450;

async function getJson(
	fetchImpl: FetchLike,
	url: string,
	signal?: AbortSignal,
): Promise<{ status: number; body: unknown }> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort, { once: true });
	try {
		const response = await fetchImpl(url, { signal: controller.signal });
		let body: unknown = null;
		try {
			body = await response.json();
		} catch {
			body = null;
		}
		return { status: response.status, body };
	} catch (error) {
		if (signal?.aborted) throw new TranslateError("aborted", "Aborted");
		throw new TranslateError(
			"network",
			error instanceof Error ? error.message : "Network error",
		);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
}

/** Translate piece by piece and put the original layout back together. */
async function translatePieces(
	text: string,
	translatePiece: (piece: string) => Promise<ProviderResult>,
): Promise<ProviderResult> {
	const pieces = chunkText(text, MAX_PIECE_BYTES);
	if (pieces.length === 0) return { text: "" };
	let detected: string | undefined;
	let out = "";
	for (const piece of pieces) {
		const result = await translatePiece(piece.text);
		detected ??= result.detected;
		out += result.text + piece.joiner;
	}
	return { text: out.trim(), detected };
}

function record(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

const MYMEMORY_CODES: Record<string, string> = { zh: "zh-CN" };

export function createMyMemoryProvider({
	email = "",
	fetchImpl = fetch,
}: { email?: string; fetchImpl?: FetchLike } = {}): Provider {
	return {
		id: "mymemory",
		async translate(request, context) {
			const source =
				request.from === "auto"
					? "Autodetect"
					: (MYMEMORY_CODES[request.from] ?? request.from);
			const target = MYMEMORY_CODES[request.to] ?? request.to;
			return translatePieces(request.text, async (piece) => {
				const params = new URLSearchParams({
					q: piece,
					langpair: `${source}|${target}`,
				});
				if (email.trim() !== "") params.set("de", email.trim());
				const { status, body } = await getJson(
					fetchImpl,
					`https://api.mymemory.translated.net/get?${params}`,
					context?.signal,
				);
				const data = record(body);
				const responseData = record(data?.responseData);
				const translated = responseData?.translatedText;
				const quota =
					status === 429 ||
					data?.quotaFinished === true ||
					data?.responseStatus === 429 ||
					(typeof translated === "string" &&
						translated.startsWith("MYMEMORY WARNING"));
				if (quota) {
					throw new TranslateError("quota", "MyMemory quota reached");
				}
				if (typeof translated !== "string" || status >= 400) {
					throw new TranslateError(
						"bad-response",
						`MyMemory returned ${status}`,
					);
				}
				const detected = responseData?.detectedLanguage;
				return {
					text: decodeEntities(translated),
					detected:
						typeof detected === "string"
							? baseLanguage(detected)
							: undefined,
				};
			});
		},
	};
}

export function createLingvaProvider({
	baseUrl = "https://lingva.ml",
	fetchImpl = fetch,
}: { baseUrl?: string; fetchImpl?: FetchLike } = {}): Provider {
	return {
		id: "lingva",
		async translate(request, context) {
			return translatePieces(request.text, async (piece) => {
				const { status, body } = await getJson(
					fetchImpl,
					`${baseUrl}/api/v1/${encodeURIComponent(request.from)}/${encodeURIComponent(request.to)}/${encodeURIComponent(piece)}`,
					context?.signal,
				);
				if (status === 429) {
					throw new TranslateError("quota", "Lingva rate limited");
				}
				const data = record(body);
				const translation = data?.translation;
				if (typeof translation !== "string" || status >= 400) {
					throw new TranslateError(
						"bad-response",
						`Lingva returned ${status}`,
					);
				}
				const detected = record(data?.info)?.detectedSource;
				return {
					text: translation,
					detected:
						typeof detected === "string"
							? baseLanguage(detected)
							: undefined,
				};
			});
		},
	};
}
