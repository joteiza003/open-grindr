import { sendMessage } from "$lib/api/messaging/messages";
import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
import { GREETING_MESSAGES } from "./tinder-deck";

/** Textos y fotos del saludo, tal como los dejó el usuario en ajustes. */
export function greetingPlan(browse: {
	greetingMessages: string[];
	greetingMediaIds: number[];
}): { texts: string[]; mediaIds: number[] } {
	const texts = browse.greetingMessages
		.map((text) => text.trim())
		.filter((text) => text !== "");
	const mediaIds = [...new Set(browse.greetingMediaIds)];
	// Sin nada configurado se usa el saludo por defecto.
	if (texts.length === 0 && mediaIds.length === 0) {
		return { texts: [...GREETING_MESSAGES], mediaIds };
	}
	return { texts, mediaIds };
}

/** Envía el saludo al aceptar un perfil: primero los textos y luego las fotos. */
export async function greetProfile(profileId: number): Promise<void> {
	const { texts, mediaIds } = greetingPlan(preferencesSnapshot().browse);
	for (const text of texts) {
		await sendMessage({
			toUserId: profileId,
			message: { type: "Text", body: { text } },
		});
	}
	for (const mediaId of mediaIds) {
		try {
			await sendMessage({
				toUserId: profileId,
				message: { type: "Image", body: { mediaId } },
			});
		} catch (error) {
			// Una foto borrada del cajón no debe tumbar el resto del saludo.
			console.error("[greet] photo failed", error);
		}
	}
}
