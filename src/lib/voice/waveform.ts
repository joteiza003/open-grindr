/** Cuántas barras se dibujan por nota de voz. */
export const WAVEFORM_BARS = 40;

/**
 * Resume unas muestras de audio en `bars` alturas entre 0 y 1: el pico de cada
 * tramo, relativo al pico mayor de toda la nota para que se vea la forma aunque
 * el volumen sea bajo.
 */
export function peaksFromSamples(
	samples: ArrayLike<number>,
	bars = WAVEFORM_BARS,
): number[] {
	if (samples.length === 0 || bars <= 0) return [];
	const peaks: number[] = [];
	const size = samples.length / bars;
	for (let bar = 0; bar < bars; bar++) {
		const from = Math.floor(bar * size);
		const to = Math.max(from + 1, Math.floor((bar + 1) * size));
		let peak = 0;
		for (let i = from; i < to && i < samples.length; i++) {
			peak = Math.max(peak, Math.abs(samples[i] ?? 0));
		}
		peaks.push(peak);
	}
	const max = Math.max(...peaks);
	return max === 0 ? peaks : peaks.map((peak) => peak / max);
}

/** Altura mínima visible de una barra (para que el silencio no desaparezca). */
export const MIN_BAR_HEIGHT = 0.08;

/** Posición (0 a 1) que corresponde a un clic dentro de la onda. */
export function seekFraction({
	clientX,
	left,
	width,
}: {
	clientX: number;
	left: number;
	width: number;
}): number {
	if (width <= 0) return 0;
	return Math.min(1, Math.max(0, (clientX - left) / width));
}

const cache = new Map<string, Promise<number[] | null>>();

/**
 * Baja el audio y calcula su onda. Devuelve `null` si el navegador no sabe
 * decodificarlo o falla la descarga: entonces se usa la barra de progreso.
 */
export function loadPeaks(
	url: string,
	bars = WAVEFORM_BARS,
): Promise<number[] | null> {
	const key = `${bars}:${url}`;
	let pending = cache.get(key);
	if (pending === undefined) {
		pending = decode(url, bars).catch(() => null);
		cache.set(key, pending);
	}
	return pending;
}

async function decode(url: string, bars: number): Promise<number[] | null> {
	const Context =
		globalThis.AudioContext ??
		(globalThis as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (Context === undefined) return null;
	const response = await fetch(url);
	if (!response.ok) return null;
	const context = new Context();
	try {
		const audio = await context.decodeAudioData(
			await response.arrayBuffer(),
		);
		return peaksFromSamples(audio.getChannelData(0), bars);
	} finally {
		void context.close().catch(() => undefined);
	}
}
