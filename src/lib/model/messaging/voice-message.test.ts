import { describe, expect, it } from "vitest";

import {
	previewFromMessage,
	previewLabel,
	quoteLabel,
} from "./message-preview";
import {
	formatVoiceDuration,
	VOICE_CONTENT_TYPE,
	voiceMessageDraft,
} from "./voice-message";

describe("voiceMessageDraft", () => {
	it("sends only the uploaded media's id", () => {
		const draft = voiceMessageDraft({
			mediaId: 42,
			url: "https://cdn.test/voice.aac",
			mediaHash: "a".repeat(64),
			lengthMs: 3200,
		});

		expect(draft.outbound).toEqual({
			type: "Audio",
			body: { mediaId: 42 },
		});
	});

	it("shows the message right away with what is known about it", () => {
		const draft = voiceMessageDraft({
			mediaId: 42,
			url: "https://cdn.test/voice.aac",
			mediaHash: null,
			lengthMs: 3200,
		});

		expect(draft.optimistic).toEqual({
			type: "Audio",
			body: {
				mediaId: 42,
				mediaHash: null,
				url: "https://cdn.test/voice.aac",
				contentType: VOICE_CONTENT_TYPE,
				length: 3200,
				expiresAt: null,
			},
		});
	});

	it("tolerates an upload answer without a url", () => {
		const draft = voiceMessageDraft({
			mediaId: 1,
			url: null,
			mediaHash: null,
			lengthMs: 1000,
		});

		expect(draft.optimistic).toMatchObject({ body: { url: "" } });
	});
});

describe("formatVoiceDuration", () => {
	it("formats whole seconds as m:ss", () => {
		expect(formatVoiceDuration(0)).toBe("0:00");
		expect(formatVoiceDuration(7400)).toBe("0:07");
		expect(formatVoiceDuration(65_000)).toBe("1:05");
		expect(formatVoiceDuration(12 * 60_000 + 3000)).toBe("12:03");
		expect(formatVoiceDuration(-50)).toBe("0:00");
	});
});

describe("voice message previews", () => {
	it("labels a voice message in the inbox and in quotes", () => {
		const preview = previewFromMessage({
			type: "Audio",
			body: {},
		} as Parameters<typeof previewFromMessage>[0]);

		expect(previewLabel(preview)).toBe("Voice message");
		expect(quoteLabel(preview)).toBe("Voice message");
	});
});
