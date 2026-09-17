import { describe, expect, it } from "vitest";

import { DEFAULT_FREQUENT_PHRASES } from "$lib/model/messaging/frequent-phrases";
import { draftFromMessage } from "$lib/model/messaging/messages";

describe("frequent phrase drafts", () => {
	it("builds the same text payload the composer send path uses", () => {
		const phrase = DEFAULT_FREQUENT_PHRASES[0]!;
		const draft = draftFromMessage({
			type: "Text",
			body: { text: phrase.text },
		});
		expect(draft.outbound).toEqual({
			type: "Text",
			body: { text: "Hola 😊" },
		});
	});
});
