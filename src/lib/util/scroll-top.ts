/** Ventana en la que dos toques seguidos cuentan como doble toque. */
export const DOUBLE_TAP_WINDOW_MS = 400;

/** ¿Este toque es el segundo de un doble toque? */
export function isDoubleTap({
	lastAt,
	now,
	windowMs = DOUBLE_TAP_WINDOW_MS,
}: {
	lastAt: number | null;
	now: number;
	windowMs?: number;
}): boolean {
	return lastAt !== null && now - lastAt <= windowMs && now >= lastAt;
}

function isScrollable(element: HTMLElement): boolean {
	if (element.scrollHeight <= element.clientHeight + 1) return false;
	const overflow = getComputedStyle(element).overflowY;
	return overflow === "auto" || overflow === "scroll";
}

/**
 * La lista que se desplaza en la pantalla actual: el elemento desplazable más
 * alto dentro de `<main>` (cuadrícula, buzón, notificaciones…).
 */
export function findMainScroller(
	root: ParentNode = document,
): HTMLElement | null {
	let best: HTMLElement | null = null;
	for (const element of root.querySelectorAll<HTMLElement>("main *")) {
		if (!isScrollable(element)) continue;
		if (best === null || element.clientHeight > best.clientHeight) {
			best = element;
		}
	}
	return best;
}

/** Sube la lista actual al principio; devuelve si había algo que subir. */
export function scrollMainToTop(root: ParentNode = document): boolean {
	const scroller = findMainScroller(root);
	if (scroller === null || scroller.scrollTop === 0) return false;
	scroller.scrollTo({ top: 0, behavior: "smooth" });
	return true;
}
