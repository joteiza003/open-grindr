const MIN_VISIBLE_MS = 3000;
const FADE_MS = 400;

/**
 * Retira la pantalla de carga de `app.html` una vez la app está lista,
 * dejándola visible un mínimo para que la animación no parpadee.
 */
export function dismissSplash(): void {
	const splash = document.getElementById("app-splash");
	if (!splash) return;
	const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
	setTimeout(() => {
		splash.classList.add("done");
		setTimeout(() => splash.remove(), FADE_MS);
	}, wait);
}
