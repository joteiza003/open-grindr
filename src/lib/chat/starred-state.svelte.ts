import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import {
	isStarred,
	type StarredMessage,
	starredIn,
	toggleStar,
} from "./starred";

let queue: Promise<unknown> = Promise.resolve();

function update(
	change: (list: readonly StarredMessage[]) => StarredMessage[],
): Promise<void> {
	const run = queue.then(() =>
		setPreferences({
			starredMessages: change(preferencesSnapshot().starredMessages),
		}),
	);
	queue = run.catch(() => undefined);
	return run;
}

export function starredMessages(): readonly StarredMessage[] {
	return preferencesSnapshot().starredMessages;
}

export function messageIsStarred(messageId: string): boolean {
	return isStarred(starredMessages(), messageId);
}

export function starredInConversation(
	conversationId: string,
): StarredMessage[] {
	return starredIn(starredMessages(), conversationId);
}

export function toggleStarred(args: {
	conversationId: string;
	messageId: string;
	text: string | null;
	timestamp: number;
}): Promise<void> {
	return update((list) =>
		toggleStar(list, { ...args, starredAt: Date.now() }),
	);
}
