export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Aumento al hacer doble toque. */
export const DOUBLE_TAP_ZOOM = 2.5;

export function clampScale(scale: number): number {
	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Escala nueva de un pellizco: la inicial por lo que han variado los dedos. */
export function pinchScale({
	startScale,
	startDistance,
	distance,
}: {
	startScale: number;
	startDistance: number;
	distance: number;
}): number {
	if (startDistance <= 0) return startScale;
	return clampScale(startScale * (distance / startDistance));
}

/** Desplazamiento máximo para no sacar la imagen ampliada del marco. */
export function clampPan({
	value,
	scale,
	size,
}: {
	value: number;
	scale: number;
	size: number;
}): number {
	const max = ((scale - 1) * size) / 2;
	return Math.min(max, Math.max(-max, value));
}

type Point = { x: number; y: number };

const distanceBetween = (a: Point, b: Point) =>
	Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Zoom de la foto de una tarjeta del carrusel: doble toque y pellizco para
 * ampliar, arrastre para moverla. Mientras está ampliada, la tarjeta no se
 * desliza: estos métodos devuelven `true` cuando han consumido el gesto.
 */
export class DeckZoom {
	scale = $state(MIN_ZOOM);
	x = $state(0);
	y = $state(0);

	#pointers = new Map<number, Point>();
	#pinch: { distance: number; scale: number } | null = null;
	#last: Point | null = null;

	get active(): boolean {
		return this.scale > MIN_ZOOM;
	}

	reset(): void {
		this.scale = MIN_ZOOM;
		this.x = 0;
		this.y = 0;
		this.#pointers.clear();
		this.#pinch = null;
		this.#last = null;
	}

	toggle(): void {
		if (this.active) this.reset();
		else this.scale = DOUBLE_TAP_ZOOM;
	}

	down(event: PointerEvent): boolean {
		this.#pointers.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY,
		});
		if (this.#pointers.size === 2) {
			const [a, b] = [...this.#pointers.values()] as [Point, Point];
			this.#pinch = {
				distance: distanceBetween(a, b),
				scale: this.scale,
			};
			return true;
		}
		this.#last = { x: event.clientX, y: event.clientY };
		return this.active;
	}

	move(event: PointerEvent): boolean {
		if (!this.#pointers.has(event.pointerId)) return this.active;
		this.#pointers.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY,
		});
		const target = event.currentTarget as HTMLElement | null;
		const box = target?.getBoundingClientRect();
		const width = box?.width ?? 0;
		const height = box?.height ?? 0;

		if (this.#pointers.size >= 2 && this.#pinch) {
			const [a, b] = [...this.#pointers.values()] as [Point, Point];
			this.scale = pinchScale({
				startScale: this.#pinch.scale,
				startDistance: this.#pinch.distance,
				distance: distanceBetween(a, b),
			});
			if (!this.active) this.reset();
			return true;
		}
		if (!this.active || this.#last === null) return false;
		const dx = event.clientX - this.#last.x;
		const dy = event.clientY - this.#last.y;
		this.#last = { x: event.clientX, y: event.clientY };
		this.x = clampPan({
			value: this.x + dx,
			scale: this.scale,
			size: width,
		});
		this.y = clampPan({
			value: this.y + dy,
			scale: this.scale,
			size: height,
		});
		return true;
	}

	up(event: PointerEvent): boolean {
		const wasPinching = this.#pinch !== null;
		this.#pointers.delete(event.pointerId);
		if (this.#pointers.size < 2) this.#pinch = null;
		this.#last = null;
		// Un pellizco que termina casi sin ampliar vuelve al tamaño normal.
		if (this.scale < 1.05) this.reset();
		return this.active || wasPinching;
	}
}
