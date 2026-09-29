import type { FavoriteNote } from "./favorites";
import { favoriteNoteLimits } from "./favorites";

/**
 * A profile has ONE user-facing note (text + phone). It lives in two places:
 * - locally (`profile-metadata`), for every profile, kept forever;
 * - on Grindr (favorite notes), only while the profile is a favorite.
 *
 * The local copy is always written; the Grindr copy is mirrored on top when the
 * profile is a favorite, so the note is also visible in the official app.
 */

export const localNoteLimits = { notes: 2000, phoneNumber: 20 } as const;

export type LocalNoteSource = { note?: string; phone?: string };

/** Effective note: the Grindr copy wins per field, the local copy fills gaps. */
export function mergeProfileNote({
	local,
	favorite,
}: {
	local: LocalNoteSource;
	favorite: FavoriteNote | null;
}): FavoriteNote {
	return {
		notes: favorite?.notes || local.note || "",
		phoneNumber: favorite?.phoneNumber || local.phone || "",
	};
}

/** Maximum note length for the editor: Grindr's cap only applies to favorites. */
export function profileNoteLimits({ isFavorite }: { isFavorite: boolean }): {
	notes: number;
	phoneNumber: number;
} {
	return isFavorite
		? {
				notes: favoriteNoteLimits.notes,
				phoneNumber: favoriteNoteLimits.phoneNumber,
			}
		: localNoteLimits;
}

export function isEmptyNote(note: FavoriteNote): boolean {
	return !note.notes.trim() && !note.phoneNumber.trim();
}
