import type { SavedAlbum } from "$lib/model/messaging/saved-albums";

export type ContactUsage = {
	key: string;
	name: string | null;
	count: number;
	bytes: number;
	localIds: string[];
};

function contactKey(album: SavedAlbum): string {
	return String(
		album.profileSnapshot.profileId ??
			album.senderId ??
			album.conversationId,
	);
}

/** Resumen de lo guardado por contacto, de mayor a menor tamaño. */
export function usageByContact(albums: SavedAlbum[]): ContactUsage[] {
	const groups = new Map<string, ContactUsage>();
	for (const album of albums) {
		const key = contactKey(album);
		const group = groups.get(key) ?? {
			key,
			name: null,
			count: 0,
			bytes: 0,
			localIds: [],
		};
		group.name ??= album.profileSnapshot.displayName;
		group.count += 1;
		group.bytes += album.sizeBytes;
		group.localIds.push(album.localId);
		groups.set(key, group);
	}
	return [...groups.values()].sort(
		(a, b) => b.bytes - a.bytes || b.count - a.count,
	);
}

export function totalBytes(albums: SavedAlbum[]): number {
	return albums.reduce((sum, album) => sum + album.sizeBytes, 0);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
