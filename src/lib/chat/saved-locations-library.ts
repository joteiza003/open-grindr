import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	type SavedLocation,
	savedLocationsFileSchema,
} from "$lib/model/messaging/saved-locations";

/** Local persistence for locations other users shared with us. */

// Flat filename: the atomic writer does not create nested subdirectories.
const INDEX_PATH = "location-map-index.json";

async function loadIndex(): Promise<SavedLocation[]> {
	if (!(await existsAppDataFile(INDEX_PATH))) return [];
	const bytes = await readAppDataFile(INDEX_PATH);
	const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
	return savedLocationsFileSchema.parse(parsed).locations;
}

async function writeIndex(locations: SavedLocation[]): Promise<void> {
	const content = new TextEncoder().encode(
		JSON.stringify({ version: 1, locations }),
	);
	await writeAppDataFileAtomic({ path: INDEX_PATH, content });
}

export async function loadSavedLocations(): Promise<SavedLocation[]> {
	return loadIndex();
}

export async function upsertSavedLocation(
	location: SavedLocation,
): Promise<void> {
	const locations = await loadIndex();
	const index = locations.findIndex((l) => l.localId === location.localId);
	if (index === -1) locations.unshift(location);
	else locations[index] = location;
	await writeIndex(locations);
}

export async function deleteSavedLocation(localId: string): Promise<void> {
	const locations = await loadIndex();
	await writeIndex(locations.filter((l) => l.localId !== localId));
}
