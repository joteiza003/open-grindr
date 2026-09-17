import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	emptyMapElementsFile,
	type MapCircle,
	type MapElementsFile,
	type MapMarker,
	parseMapElementsFile,
} from "$lib/model/map-elements";

/**
 * Persistent overlay elements on the map layer.
 * Independent from preferences.geohash (custom user location)
 * and from location-map-index.json (chat-shared pins).
 */
const ELEMENTS_PATH = "map-elements.json";

export type MapElementsBackend = {
	load(): Promise<MapElementsFile>;
	save(file: MapElementsFile): Promise<void>;
};

async function loadFromAppData(): Promise<MapElementsFile> {
	if (!(await existsAppDataFile(ELEMENTS_PATH))) {
		return emptyMapElementsFile();
	}
	try {
		const bytes = await readAppDataFile(ELEMENTS_PATH);
		const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
		return parseMapElementsFile(parsed);
	} catch (error) {
		console.error("[map-elements] Failed to read", error);
		return emptyMapElementsFile();
	}
}

async function saveToAppData(file: MapElementsFile): Promise<void> {
	const content = new TextEncoder().encode(
		JSON.stringify({
			version: 1,
			circles: file.circles,
			markers: file.markers,
		} satisfies MapElementsFile),
	);
	await writeAppDataFileAtomic({ path: ELEMENTS_PATH, content });
}

export const appDataMapElementsBackend: MapElementsBackend = {
	load: loadFromAppData,
	save: saveToAppData,
};

export function memoryMapElementsBackend(
	seed: MapElementsFile = emptyMapElementsFile(),
): MapElementsBackend {
	let current: MapElementsFile = {
		version: 1,
		circles: [...seed.circles],
		markers: [...seed.markers],
	};
	return {
		load() {
			return Promise.resolve({
				version: 1 as const,
				circles: [...current.circles],
				markers: [...current.markers],
			});
		},
		save(file) {
			current = {
				version: 1,
				circles: [...file.circles],
				markers: [...file.markers],
			};
			return Promise.resolve();
		},
	};
}

export async function loadMapElements(
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<MapElementsFile> {
	return backend.load();
}

export async function saveMapElements(
	file: MapElementsFile,
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<void> {
	await backend.save({
		version: 1,
		circles: file.circles,
		markers: file.markers,
	});
}

export async function addCircle(
	circle: MapCircle,
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<MapElementsFile> {
	const file = await backend.load();
	const next = {
		version: 1 as const,
		circles: [
			...file.circles.filter((item) => item.id !== circle.id),
			circle,
		],
		markers: file.markers,
	};
	await backend.save(next);
	return next;
}

export async function deleteCircle(
	id: string,
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<MapElementsFile> {
	const file = await backend.load();
	const next = {
		version: 1 as const,
		circles: file.circles.filter((item) => item.id !== id),
		markers: file.markers,
	};
	await backend.save(next);
	return next;
}

export async function addMarker(
	marker: MapMarker,
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<MapElementsFile> {
	const file = await backend.load();
	const next = {
		version: 1 as const,
		circles: file.circles,
		markers: [
			...file.markers.filter((item) => item.id !== marker.id),
			marker,
		],
	};
	await backend.save(next);
	return next;
}

export async function deleteMarker(
	id: string,
	backend: MapElementsBackend = appDataMapElementsBackend,
): Promise<MapElementsFile> {
	const file = await backend.load();
	const next = {
		version: 1 as const,
		circles: file.circles,
		markers: file.markers.filter((item) => item.id !== id),
	};
	await backend.save(next);
	return next;
}
