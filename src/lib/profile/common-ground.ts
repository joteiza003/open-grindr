export type ProfileTraits = {
	profileTags?: readonly string[] | null;
	lookingFor?: readonly number[] | null;
	meetAt?: readonly number[] | null;
	grindrTribes?: readonly number[] | null;
};

export type CommonGround = {
	tags: string[];
	lookingFor: number[];
	meetAt: number[];
	tribes: number[];
};

const both = <T>(
	a: readonly T[] | null | undefined,
	b: readonly T[] | null | undefined,
) => (b ?? []).filter((item) => (a ?? []).includes(item));

/** Lo que dos perfiles tienen en común (etiquetas sin distinguir mayúsculas). */
export function commonGround(
	mine: ProfileTraits,
	theirs: ProfileTraits,
): CommonGround {
	const myTags = new Set(
		(mine.profileTags ?? []).map((tag) => tag.toLowerCase()),
	);
	return {
		tags: (theirs.profileTags ?? []).filter((tag) =>
			myTags.has(tag.toLowerCase()),
		),
		lookingFor: both(mine.lookingFor, theirs.lookingFor),
		meetAt: both(mine.meetAt, theirs.meetAt),
		tribes: both(mine.grindrTribes, theirs.grindrTribes),
	};
}

export function hasCommonGround(common: CommonGround): boolean {
	return (
		common.tags.length +
			common.lookingFor.length +
			common.meetAt.length +
			common.tribes.length >
		0
	);
}
