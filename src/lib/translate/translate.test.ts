import { describe, expect, it, vi } from "vitest";

import {
	createLingvaProvider,
	createMyMemoryProvider,
	type Provider,
	TranslateError,
} from "./providers";
import { byteLength, chunkText, decodeEntities, isTranslatable } from "./text";
import { Translator } from "./translator";

describe("text helpers", () => {
	it("decodes the entities providers return", () => {
		expect(decodeEntities("don&#39;t &amp; &quot;go&quot; &#x41;")).toBe(
			`don't & "go" A`,
		);
		expect(decodeEntities("&unknown; &#0;")).toBe("&unknown; &#0;");
	});

	it("only translates text with real words", () => {
		expect(isTranslatable("Hola")).toBe(true);
		expect(isTranslatable("😀😀")).toBe(false);
		expect(isTranslatable("123 ?!")).toBe(false);
		expect(isTranslatable("a")).toBe(false);
	});

	it("keeps short text as a single piece", () => {
		expect(chunkText("Hola qué tal", 100)).toEqual([
			{ text: "Hola qué tal", joiner: "" },
		]);
	});

	it("keeps line breaks between pieces", () => {
		const pieces = chunkText("Uno\n\nDos", 100);
		expect(pieces).toEqual([
			{ text: "Uno", joiner: "\n\n" },
			{ text: "Dos", joiner: "" },
		]);
	});

	it("splits long text under the byte limit without losing words", () => {
		const text = Array.from({ length: 60 }, (_, i) => `palabra${i}.`).join(
			" ",
		);
		const pieces = chunkText(text, 100);
		expect(pieces.length).toBeGreaterThan(3);
		for (const piece of pieces) {
			expect(byteLength(piece.text)).toBeLessThanOrEqual(100);
		}
		const rebuilt = pieces.map((p) => p.text).join(" ");
		expect(rebuilt.replace(/\s+/g, " ")).toBe(text);
	});

	it("splits a single huge word and counts bytes, not characters", () => {
		const pieces = chunkText("ñ".repeat(200), 50);
		for (const piece of pieces) {
			expect(byteLength(piece.text)).toBeLessThanOrEqual(50);
		}
		expect(pieces.map((p) => p.text).join("")).toBe("ñ".repeat(200));
	});
});

function fakeFetch(body: unknown, status = 200) {
	return vi.fn((url: string) =>
		Promise.resolve({
			url,
			ok: status < 400,
			status,
			json: () => Promise.resolve(body),
		}),
	);
}

describe("MyMemory provider", () => {
	it("translates, autodetects and decodes entities", async () => {
		const fetchImpl = fakeFetch({
			responseData: {
				translatedText: "I don&#39;t know",
				detectedLanguage: "eu-ES",
			},
			responseStatus: 200,
		});
		const provider = createMyMemoryProvider({ fetchImpl });
		const result = await provider.translate({
			text: "Ez dakit",
			from: "auto",
			to: "en",
		});
		expect(result).toEqual({ text: "I don't know", detected: "eu" });
		const url = String(fetchImpl.mock.calls[0]?.[0]);
		expect(url).toContain("langpair=Autodetect%7Cen");
		expect(url).not.toContain("de=");
	});

	it("sends the optional email to raise the daily quota", async () => {
		const fetchImpl = fakeFetch({ responseData: { translatedText: "ok" } });
		await createMyMemoryProvider({
			email: "me@example.com",
			fetchImpl,
		}).translate({ text: "hola", from: "es", to: "zh" });
		const url = String(fetchImpl.mock.calls[0]?.[0]);
		expect(url).toContain("de=me%40example.com");
		expect(url).toContain("langpair=es%7Czh-CN");
	});

	it("reports quota exhaustion in every form MyMemory uses", async () => {
		const cases = [
			fakeFetch({}, 429),
			fakeFetch({
				quotaFinished: true,
				responseData: { translatedText: "x" },
			}),
			fakeFetch({
				responseData: {
					translatedText:
						"MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY",
				},
			}),
		];
		for (const fetchImpl of cases) {
			await expect(
				createMyMemoryProvider({ fetchImpl }).translate({
					text: "hola",
					from: "es",
					to: "en",
				}),
			).rejects.toMatchObject({ code: "quota" });
		}
	});

	it("maps network failures and malformed bodies", async () => {
		await expect(
			createMyMemoryProvider({
				fetchImpl: () => Promise.reject(new Error("offline")),
			}).translate({ text: "hola", from: "es", to: "en" }),
		).rejects.toMatchObject({ code: "network" });
		await expect(
			createMyMemoryProvider({
				fetchImpl: fakeFetch({ nope: 1 }),
			}).translate({ text: "hola", from: "es", to: "en" }),
		).rejects.toMatchObject({ code: "bad-response" });
	});

	it("translates long text in several requests and keeps the layout", async () => {
		let n = 0;
		const fetchImpl = vi.fn((url: string) => {
			void url;
			n += 1;
			return Promise.resolve({
				ok: true,
				status: 200,
				json: () =>
					Promise.resolve({
						responseData: { translatedText: `T${n}` },
					}),
			});
		});
		const result = await createMyMemoryProvider({ fetchImpl }).translate({
			text: `${"a".repeat(300)}\n${"b".repeat(300)}`,
			from: "es",
			to: "en",
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(result.text).toBe("T1\nT2");
	});
});

describe("Lingva provider", () => {
	it("reads translation and detected language", async () => {
		const fetchImpl = fakeFetch({
			translation: "Hello",
			info: { detectedSource: "es" },
		});
		const result = await createLingvaProvider({ fetchImpl }).translate({
			text: "Hola",
			from: "auto",
			to: "en",
		});
		expect(result).toEqual({ text: "Hello", detected: "es" });
		expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
			"https://lingva.ml/api/v1/auto/en/Hola",
		);
	});
});

function provider(
	id: string,
	impl: Provider["translate"],
): Provider & { calls: number } {
	const p = {
		id,
		calls: 0,
		translate: (...args: Parameters<Provider["translate"]>) => {
			p.calls += 1;
			return impl(...args);
		},
	};
	return p;
}

describe("Translator", () => {
	it("falls back to the next provider and caches the result", async () => {
		const bad = provider("a", () =>
			Promise.reject(new TranslateError("quota", "no")),
		);
		const good = provider("b", () =>
			Promise.resolve({ text: "Hello", detected: "es" }),
		);
		const translator = new Translator(() => [bad, good]);
		const first = await translator.translate("Hola", { to: "en" });
		expect(first).toMatchObject({
			text: "Hello",
			provider: "b",
			from: "es",
			sameLanguage: false,
		});
		await translator.translate("Hola", { to: "en" });
		expect(bad.calls).toBe(1);
		expect(good.calls).toBe(1);
		expect(translator.cacheSize).toBe(1);
	});

	it("shares identical in-flight requests", async () => {
		const slow = provider(
			"a",
			() => new Promise((r) => setTimeout(() => r({ text: "Hi" }), 10)),
		);
		const translator = new Translator(() => [slow]);
		const [a, b] = await Promise.all([
			translator.translate("Hola", { to: "en" }),
			translator.translate("Hola", { to: "en" }),
		]);
		expect(a).toBe(b);
		expect(slow.calls).toBe(1);
	});

	it("returns the original when it is already in the target language", async () => {
		const p = provider("a", () =>
			Promise.resolve({ text: "Hello there", detected: "en" }),
		);
		const result = await new Translator(() => [p]).translate("Hello", {
			to: "en",
		});
		expect(result).toMatchObject({ text: "Hello", sameLanguage: true });
	});

	it("skips the network for nothing-to-translate input and same languages", async () => {
		const p = provider("a", () => Promise.resolve({ text: "x" }));
		const translator = new Translator(() => [p]);
		await translator.translate("😀", { to: "en" });
		await translator.translate("hola", { from: "es", to: "es" });
		expect(p.calls).toBe(0);
	});

	it("prefers reporting quota over other errors when everything fails", async () => {
		const net = provider("a", () =>
			Promise.reject(new TranslateError("network", "down")),
		);
		const quota = provider("b", () =>
			Promise.reject(new TranslateError("quota", "full")),
		);
		await expect(
			new Translator(() => [quota, net]).translate("Hola", { to: "en" }),
		).rejects.toMatchObject({ code: "quota" });
	});

	it("does not fall back or cache when aborted, and can be cleared", async () => {
		const abort = provider("a", () =>
			Promise.reject(new TranslateError("aborted", "x")),
		);
		const next = provider("b", () => Promise.resolve({ text: "Hi" }));
		const translator = new Translator(() => [abort, next]);
		await expect(
			translator.translate("Hola", { to: "en" }),
		).rejects.toMatchObject({ code: "aborted" });
		expect(next.calls).toBe(0);
		expect(translator.cacheSize).toBe(0);

		const ok = new Translator(() => [next]);
		await ok.translate("Hola", { to: "en" });
		ok.clearCache();
		expect(ok.cacheSize).toBe(0);
	});
});
