import { existsAppDataFile, readAppDataFile } from "$lib/app-data";
import type { SavedAlbum } from "$lib/model/messaging/saved-albums";
import { albumMediaPath } from "./saved-album-library";

/**
 * Exporta los archivos de la biblioteca como descargas del sistema. La carpeta
 * final la decide el sistema (normalmente «Descargas»): la app no puede elegir
 * una carpeta propia sin un permiso nativo adicional.
 */
export async function exportLibrary(albums: SavedAlbum[]): Promise<number> {
	let exported = 0;
	for (const album of albums) {
		for (const item of album.items) {
			const path = albumMediaPath(item.localPath);
			if (!(await existsAppDataFile(path))) continue;
			const bytes = await readAppDataFile(path);
			const copy = new Uint8Array(bytes.byteLength);
			copy.set(bytes);
			const url = URL.createObjectURL(
				new Blob([copy], { type: item.contentType }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = item.localPath.replace(/^album-media__/, "");
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
			exported++;
		}
	}
	return exported;
}
