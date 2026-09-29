import { toast } from "svelte-sonner";

import { t } from "$lib/i18n";
import {
	MAX_PHRASE_LENGTH,
	MAX_PHRASES,
	type PhraseProblem,
} from "$lib/model/messaging/frequent-phrases";
import { addFrequentPhraseFromText } from "./frequent-phrases-library";

export function phraseProblemMessage(problem: PhraseProblem): string {
	switch (problem) {
		case "duplicate":
			return t("phrases.duplicate");
		case "too-long":
			return t("phrases.tooLong", { max: MAX_PHRASE_LENGTH });
		case "limit":
			return t("phrases.limit", { max: MAX_PHRASES });
		case "empty":
			return t("phrases.empty");
	}
}

/** Save a chat message's text as a frequent phrase and tell the user how it went. */
export async function addMessageToFrequentPhrases(text: string): Promise<void> {
	try {
		const problem = await addFrequentPhraseFromText(text);
		if (problem) toast.error(phraseProblemMessage(problem));
		else toast.success(t("phrases.added"));
	} catch (error) {
		console.error(error);
		toast.error(t("phrases.failed"));
	}
}
