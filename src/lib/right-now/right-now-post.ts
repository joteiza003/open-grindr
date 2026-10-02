/** Campos de un perfil que importan para una publicación de Right Now. */
export type RightNowSource = {
	profileId: number;
	displayName: string | null;
	age: number | null;
	showAge: boolean;
	distance: number | null;
	showDistance: boolean;
	medias: readonly { mediaHash: string }[];
	rightNowText: string | null;
	rightNowPosted: number | null;
	rightNowDistance: number | null;
	rightNowThumbnailUrl: string | null;
	rightNowFullImageUrl: string | null;
};

export type RightNowPost = {
	profileId: number;
	displayName: string | null;
	age: number | null;
	/** En metros, o null si la persona no la muestra. */
	distance: number | null;
	mediaHash: string | null;
	text: string | null;
	postedAt: number | null;
	thumbnailUrl: string | null;
	imageUrl: string | null;
};

/**
 * Convierte un perfil en una publicación de Right Now, o `null` si no tiene
 * nada publicado (ni texto ni imagen).
 */
export function toRightNowPost(source: RightNowSource): RightNowPost | null {
	const text = source.rightNowText?.trim() || null;
	const imageUrl = source.rightNowFullImageUrl || null;
	const thumbnailUrl = source.rightNowThumbnailUrl || imageUrl;
	if (text === null && imageUrl === null && thumbnailUrl === null)
		return null;
	return {
		profileId: source.profileId,
		displayName: source.displayName,
		age: source.showAge ? source.age : null,
		distance:
			source.rightNowDistance ??
			(source.showDistance ? source.distance : null),
		mediaHash: source.medias[0]?.mediaHash ?? null,
		text,
		postedAt: source.rightNowPosted,
		thumbnailUrl,
		imageUrl,
	};
}

/** Más recientes primero; las que no traen fecha, al final y por cercanía. */
export function sortRightNowPosts(
	posts: readonly RightNowPost[],
): RightNowPost[] {
	return [...posts].sort((a, b) => {
		if (a.postedAt !== null && b.postedAt !== null)
			return b.postedAt - a.postedAt;
		if (a.postedAt !== null) return -1;
		if (b.postedAt !== null) return 1;
		return (
			(a.distance ?? Number.POSITIVE_INFINITY) -
			(b.distance ?? Number.POSITIVE_INFINITY)
		);
	});
}

/** Id de la conversación directa entre dos perfiles. */
export function directConversationId(a: number, b: number): string {
	return [a, b].toSorted((x, y) => x - y).join(":");
}
