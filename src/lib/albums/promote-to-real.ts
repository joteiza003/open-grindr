import {
	addDrawerMediaToAlbum,
	createAlbum,
	getAlbumStorageLimits,
	getMyAlbums,
} from "$lib/api/messaging/albums";

/** Ids de la cámara de chat que caben en un álbum real, respetando el límite de la cuenta. */
export function fitToLimit(ids: number[], max: number): number[] {
	return [...new Set(ids)].slice(0, Math.max(0, max));
}

export type PromoteResult =
	| { status: "created"; albumId: number; added: number; total: number }
	| { status: "no-room" };

/**
 * Crea un álbum real de Grindr con fotos de la cámara de chat. No se pueden
 * superar los límites de la cuenta: si no cabe otro álbum se devuelve
 * `no-room`, y si sobran fotos se añaden solo las que caben.
 */
export async function createRealAlbumFromDrawer({
	name,
	mediaIds,
}: {
	name: string;
	mediaIds: number[];
}): Promise<PromoteResult> {
	const [limits, mine] = await Promise.all([
		getAlbumStorageLimits(),
		getMyAlbums(),
	]);
	if (mine.albums.length >= limits.maxAlbums) return { status: "no-room" };
	const ids = fitToLimit(mediaIds, limits.maxContentItemsPerAlbum);
	const { albumId } = await createAlbum({ albumName: name });
	if (ids.length > 0) await addDrawerMediaToAlbum({ albumId, mediaIds: ids });
	return {
		status: "created",
		albumId,
		added: ids.length,
		total: new Set(mediaIds).size,
	};
}
