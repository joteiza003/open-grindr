import { sendMessage } from "$lib/api/messaging/messages";
import { GREETING_MESSAGES } from "./tinder-deck";

/** Envía los mensajes de saludo al aceptar un perfil, uno tras otro. */
export async function greetProfile(profileId: number): Promise<void> {
	for (const text of GREETING_MESSAGES) {
		await sendMessage({
			toUserId: profileId,
			message: { type: "Text", body: { text } },
		});
	}
}
