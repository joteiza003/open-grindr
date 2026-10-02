import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";

/** Modo discreto: fotos y vídeos del chat ocultos hasta pulsarlos. */
export function discreetModeEnabled(): boolean {
	// Los tests de otras pantallas simulan las preferencias a medias.
	return (
		(preferencesSnapshot() as { chat?: { discreetMode?: boolean } }).chat
			?.discreetMode ?? false
	);
}

export async function setDiscreetMode(enabled: boolean): Promise<void> {
	await setPreferences({
		chat: { ...preferencesSnapshot().chat, discreetMode: enabled },
	});
}
