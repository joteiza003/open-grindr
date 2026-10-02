export type Leaving = "left" | "right" | "up" | null;

export type CardMotion = {
	rotation: number;
	x: number;
	y: number;
	/** El gesto va hacia arriba (omitir) y no hacia un lado. */
	upwards: boolean;
	acceptOpacity: number;
	rejectOpacity: number;
	skipOpacity: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Posición, giro y rótulos de la tarjeta del carrusel según lo arrastrado
 * (`dx`, `dy`) o la salida en curso (`leaving`).
 */
export function cardMotion({
	dx,
	dy,
	leaving,
}: {
	dx: number;
	dy: number;
	leaving: Leaving;
}): CardMotion {
	// Es "arriba" si domina el movimiento vertical hacia arriba.
	const upwards = dy < 0 && -dy > Math.abs(dx);
	let rotation = Math.max(-14, Math.min(14, dx / 14));
	let x = dx;
	let y = dy;
	if (leaving === "right") {
		rotation = 18;
		x = 600;
		y = 0;
	} else if (leaving === "left") {
		rotation = -18;
		x = -600;
		y = 0;
	} else if (leaving === "up") {
		rotation = 0;
		x = 0;
		y = -700;
	}
	return {
		rotation,
		x,
		y,
		upwards,
		acceptOpacity: upwards ? 0 : clamp01(dx / 90),
		rejectOpacity: upwards ? 0 : clamp01(-dx / 90),
		skipOpacity: upwards ? clamp01(-dy / 90) : 0,
	};
}
