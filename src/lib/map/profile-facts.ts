import type { getProfiles } from "$lib/api/users/profiles";
import type { Profile } from "$lib/model/users/profiles";

/**
 * What the map knows about the profile behind a pin, in two parts:
 *
 * - `LiveFacts` come from the short profile lookup (one request for up to 30
 *   profiles): who is online right now, age, favorites. They go stale in a
 *   minute and are asked for again.
 * - `DetailFacts` come from the full profile (one request each): tribes, body
 *   type, height and the rest of what the browse filters can ask for. They
 *   hardly change, and are only fetched while a filter needs them.
 */
export type LiveFacts = {
	/** Online until this time (ms); in the past or null means offline. */
	onlineUntil: number | null;
	/** Null when the profile hides its age. */
	age: number | null;
	isFavorite: boolean;
	/** New to the app. */
	isNew: boolean;
	/** Has a Right Now post up. */
	rightNow: boolean;
	lastChatTimestamp: number | null;
	hasPhotos: boolean;
	/** The short lookup does not always carry it; `undefined` means "not told". */
	sexualPosition: number | null | undefined;
};

export type DetailFacts = {
	genders: number[];
	tags: string[];
	tribes: number[];
	bodyType: number | null;
	/** Centimeters. */
	height: number | null;
	/** Grams. */
	weight: number | null;
	relationshipStatus: number | null;
	nsfw: number | null;
	lookingFor: number[];
	meetAt: number[];
	sexualHealth: number[];
	sexualPosition: number | null;
};

/**
 * Everything known about one profile. `details` is `undefined` until asked
 * for, and `null` when the profile could not be fetched (blocked, hidden,
 * gone).
 */
export type ProfileFacts = {
	live?: LiveFacts;
	liveAt?: number;
	details?: DetailFacts | null;
	detailsAt?: number;
};

type ShortProfile = Awaited<ReturnType<typeof getProfiles>>[number];

export function liveFactsOf(profile: ShortProfile): LiveFacts {
	return {
		onlineUntil: profile.onlineUntil ?? null,
		age: profile.showAge ? profile.age : null,
		isFavorite: profile.isFavorite,
		isNew: profile.isNew,
		rightNow: profile.rightNow !== "NOT_ACTIVE",
		lastChatTimestamp: profile.lastChatTimestamp,
		hasPhotos:
			profile.medias.length > 0 || profile.profileImageMediaHash !== null,
		sexualPosition: profile.sexualPosition,
	};
}

export function detailFactsOf(profile: Profile): DetailFacts {
	return {
		genders: profile.genders ?? [],
		tags: profile.profileTags,
		// What a profile keeps hidden cannot be matched on.
		tribes: profile.showTribes ? profile.grindrTribes : [],
		bodyType: profile.bodyType,
		height: profile.height,
		weight: profile.weight,
		relationshipStatus: profile.relationshipStatus,
		nsfw: profile.nsfw,
		lookingFor: profile.lookingFor,
		meetAt: profile.meetAt ?? [],
		sexualHealth: profile.sexualHealth,
		sexualPosition: profile.showPosition
			? (profile.sexualPosition ?? null)
			: null,
	};
}

/** Online right now, going by the last lookup. */
export function isOnlineNow(
	facts: ProfileFacts | undefined,
	now: number,
): boolean {
	return (facts?.live?.onlineUntil ?? 0) > now;
}
