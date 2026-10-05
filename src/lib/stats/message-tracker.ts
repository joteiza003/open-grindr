import { chatV1MessageSentEventSchema, ws } from "$lib/ws.svelte";
import { type UsageEventLog, usageEvents } from "./event-log";

/** Ids de mensaje recordados para no contar dos veces un mismo evento. */
const MAX_REMEMBERED_MESSAGES = 500;

/**
 * Anota en el registro de uso cada mensaje enviado o recibido. Escucha el
 * mismo evento que el buzón, pero por separado: así las estadísticas no
 * dependen de que la pantalla de chat esté abierta.
 */
export function startMessageTracking({
	ourProfileId,
	log = usageEvents,
}: {
	ourProfileId: number;
	log?: UsageEventLog;
}): () => void {
	const remembered = new Set<string>();
	let stopped = false;

	const subscription = ws.on(
		"chat.v1.message_sent",
		chatV1MessageSentEventSchema,
		({ payload: message }) => {
			if (stopped || remembered.has(message.messageId)) return;
			remembered.add(message.messageId);
			if (remembered.size > MAX_REMEMBERED_MESSAGES) {
				const oldest = remembered.values().next().value;
				if (oldest !== undefined) remembered.delete(oldest);
			}
			log.record({
				k: message.senderId === ourProfileId ? "out" : "in",
				c: message.conversationId,
			});
		},
	);

	return () => {
		stopped = true;
		void subscription.then((unlisten) => unlisten());
	};
}
