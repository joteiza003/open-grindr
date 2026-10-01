import z from "zod";

/** Acciones que se pueden asignar a deslizar una conversación. */
export const SWIPE_ACTIONS = ["pin", "mute", "delete", "none"] as const;

export type SwipeAction = (typeof SWIPE_ACTIONS)[number];

export const swipeActionSchema = z.enum(SWIPE_ACTIONS);

/** Distancia horizontal a partir de la cual el gesto se confirma al soltar. */
export const SWIPE_TRIGGER_PX = 80;
/** Hasta aquí sigue al dedo la fila; más allá casi no se mueve. */
export const SWIPE_MAX_PX = 120;
/** Por debajo de esto el gesto aún no ha elegido eje (puede ser scroll vertical). */
export const SWIPE_AXIS_SLOP_PX = 10;

export type SwipeIntent = "undecided" | "horizontal" | "vertical";

/** Decide si un gesto va en horizontal o es un scroll vertical. */
export function swipeIntent({
	dx,
	dy,
}: {
	dx: number;
	dy: number;
}): SwipeIntent {
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	if (Math.max(ax, ay) < SWIPE_AXIS_SLOP_PX) return "undecided";
	// Hace falta que el movimiento horizontal domine claramente.
	return ax > ay * 1.5 ? "horizontal" : "vertical";
}

/** Desplazamiento visual de la fila: sigue al dedo y se frena al final. */
export function swipeOffset(dx: number): number {
	const sign = dx < 0 ? -1 : 1;
	const abs = Math.abs(dx);
	if (abs <= SWIPE_TRIGGER_PX) return dx;
	const extra = Math.min(abs - SWIPE_TRIGGER_PX, 200) * 0.25;
	return sign * Math.min(SWIPE_TRIGGER_PX + extra, SWIPE_MAX_PX);
}

/** Acción que dispara un gesto al soltar, o `null` si no llega al umbral. */
export function swipeResult({
	dx,
	actions,
}: {
	dx: number;
	actions: { left: SwipeAction; right: SwipeAction };
}): Exclude<SwipeAction, "none"> | null {
	if (Math.abs(dx) < SWIPE_TRIGGER_PX) return null;
	const action = dx > 0 ? actions.right : actions.left;
	return action === "none" ? null : action;
}
