import z from "zod";
import { SvelteMap } from "svelte/reactivity";

import { notificationEventSchema, ws } from "$lib/ws.svelte";

export const typingStatusEventSchema = notificationEventSchema.safeExtend({
	type: z.literal("chat.v1.typing_status"),
	payload: z.object({
		conversationId: z.string(),
		profileId: z.coerce.number(),
		status: z.string(),
	}),
});

/** Si no llega otro aviso, "escribiendo…" se apaga solo pasado este tiempo. */
export const TYPING_TIMEOUT_MS = 8_000;

class TypingState {
	// conversación → perfil que está escribiendo
	#typing = new SvelteMap<string, number>();
	#timers = new Map<string, ReturnType<typeof setTimeout>>();

	isTyping(conversationId: string): boolean {
		return this.#typing.has(conversationId);
	}

	/** Aplica un aviso del servidor: `Typing` enciende; `Cleared` y `Sent` apagan. */
	apply({
		conversationId,
		profileId,
		status,
		ourProfileId,
	}: {
		conversationId: string;
		profileId: number;
		status: string;
		ourProfileId: number;
	}): void {
		// Lo que escribimos nosotros no se anuncia.
		if (profileId === ourProfileId) return;
		const timer = this.#timers.get(conversationId);
		if (timer !== undefined) clearTimeout(timer);
		this.#timers.delete(conversationId);
		if (status !== "Typing") {
			this.#typing.delete(conversationId);
			return;
		}
		this.#typing.set(conversationId, profileId);
		this.#timers.set(
			conversationId,
			setTimeout(() => {
				this.#timers.delete(conversationId);
				this.#typing.delete(conversationId);
			}, TYPING_TIMEOUT_MS),
		);
	}

	clear(): void {
		for (const timer of this.#timers.values()) clearTimeout(timer);
		this.#timers.clear();
		this.#typing.clear();
	}
}

export const typing = new TypingState();

/** Escucha los avisos de "escribiendo" mientras la sesión está abierta. */
export function startTypingTracking({
	ourProfileId,
}: {
	ourProfileId: number;
}): () => void {
	let stopped = false;
	const subscription = ws.on(
		"chat.v1.typing_status",
		typingStatusEventSchema,
		({ payload }) => {
			if (stopped) return;
			typing.apply({ ...payload, ourProfileId });
		},
	);
	return () => {
		stopped = true;
		typing.clear();
		void subscription.then((unlisten) => unlisten());
	};
}
