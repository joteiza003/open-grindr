import { formatDuration } from "$lib/stats/format";

export type AlbumExpiryInfo =
	| { state: "none" }
	| { state: "active"; remainingMs: number; label: string }
	| { state: "expired" };

/**
 * Estado de caducidad de un álbum en el chat, a partir de lo que informa el
 * servidor (`expiresAt` o `viewableUntil`). Sin fecha no hay cuenta atrás.
 */
export function albumExpiryInfo(
	{
		expiresAt,
		viewableUntil,
	}: { expiresAt?: number | null; viewableUntil?: number | null },
	now: number,
): AlbumExpiryInfo {
	const deadline = expiresAt ?? viewableUntil ?? null;
	if (deadline === null) return { state: "none" };
	const remainingMs = deadline - now;
	if (remainingMs <= 0) return { state: "expired" };
	return { state: "active", remainingMs, label: formatDuration(remainingMs) };
}

/** ¿Tiene sentido ofrecer "renovar"? Solo si lo compartimos nosotros y hay plazo. */
export function canRenewAlbum({
	info,
	isOwner,
}: {
	info: AlbumExpiryInfo;
	isOwner: boolean;
}): boolean {
	return isOwner && info.state !== "none";
}
