import {
	AGE_MAX,
	AGE_MIN,
	type GridSearchFilters,
	HEIGHT_CM_MAX,
	HEIGHT_CM_MIN,
	isFilterableTagKey,
	isFullRange,
	WEIGHT_KG_MAX,
	WEIGHT_KG_MIN,
} from "$lib/model/browse/grid/filters";
import type { DetailFacts, LiveFacts, ProfileFacts } from "./profile-facts";

/** The browse filters pick "not specified" with this id. */
const NOT_SPECIFIED = -1;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What a profile can say about itself against the browse filters: it matches,
 * it does not, or what is needed to tell has not arrived yet.
 */
export type Verdict = "match" | "no" | "unknown";

export type CompiledFilters = {
	/** False when no filter that looks at a profile is on. */
	active: boolean;
	/** Which kind of data the filters in use need. */
	needs: { live: boolean; details: boolean };
	verdict(facts: ProfileFacts | undefined, now: number): Verdict;
};

type LiveCheck = (facts: LiveFacts, now: number) => boolean;
type DetailCheck = (facts: DetailFacts, live: LiveFacts | undefined) => boolean;

const rangeActive = (
	enabled: boolean,
	range: number[],
	min: number,
	max: number,
) => enabled && !isFullRange({ range, min, max });

/** A bound at the floor or the ceiling of its slider means "no limit". */
const within = ([from = 0, to = 0]: number[], min: number, max: number) => {
	return (value: number) =>
		(from <= min || value >= from) && (to >= max || value <= to);
};

const listActive = (enabled: boolean, values: readonly unknown[]) =>
	enabled && values.length > 0;

/** For something a profile has one of ("Top", "Bear"…). */
const hasOneOf =
	(wanted: readonly number[]) =>
	(value: number | null): boolean =>
		value === null
			? wanted.includes(NOT_SPECIFIED)
			: wanted.includes(value);

/** For something a profile can have several of (tribes, looking for…). */
const hasAnyOf =
	(wanted: readonly number[]) =>
	(values: readonly number[]): boolean =>
		values.length === 0
			? wanted.includes(NOT_SPECIFIED)
			: values.some((value) => wanted.includes(value));

/**
 * Turns the browse filters into something that can be asked about a profile
 * on the map. The meaning follows the browse screen: a list of choices
 * matches a profile that has any of them, and "not specified" matches one
 * that has said nothing. Filters only the server can answer ("has face
 * pictures", "has albums") are left out.
 */
export function compileFilters(filters: GridSearchFilters): CompiledFilters {
	const live: LiveCheck[] = [];
	const details: DetailCheck[] = [];

	if (filters.isFavorite) live.push((facts) => facts.isFavorite);
	if (filters.isOnline) {
		live.push((facts, now) => (facts.onlineUntil ?? 0) > now);
	}
	if (filters.isRightNow) live.push((facts) => facts.rightNow);
	if (filters.isFresh) live.push((facts) => facts.isNew);
	if (filters.haventChattedTodayEnabled) {
		live.push(
			(facts, now) =>
				facts.lastChatTimestamp === null ||
				now - facts.lastChatTimestamp >= DAY_MS,
		);
	}
	if (rangeActive(filters.ageEnabled, filters.age, AGE_MIN, AGE_MAX)) {
		const inRange = within(filters.age, AGE_MIN, AGE_MAX);
		live.push((facts) => facts.age !== null && inRange(facts.age));
	}
	if (filters.photosEnabled && filters.photos.includes("has-photos")) {
		live.push((facts) => facts.hasPhotos);
	}

	if (listActive(filters.genderEnabled, filters.genders)) {
		const any = hasAnyOf([...filters.genders]);
		details.push((facts) => any(facts.genders));
	}
	const tags = filters.tags.filter(isFilterableTagKey);
	if (listActive(filters.tagsEnabled, tags)) {
		const wanted = new Set(tags.map((tag) => tag.toLowerCase()));
		details.push((facts) =>
			facts.tags.some((tag) => wanted.has(tag.toLowerCase())),
		);
	}
	if (listActive(filters.positionEnabled, filters.positions)) {
		const one = hasOneOf([...filters.positions]);
		details.push((facts, liveFacts) =>
			one(facts.sexualPosition ?? liveFacts?.sexualPosition ?? null),
		);
	}
	if (listActive(filters.tribesEnabled, filters.tribes)) {
		const any = hasAnyOf([...filters.tribes]);
		details.push((facts) => any(facts.tribes));
	}
	if (listActive(filters.bodyTypesEnabled, filters.bodyTypes)) {
		const one = hasOneOf([...filters.bodyTypes]);
		details.push((facts) => one(facts.bodyType));
	}
	if (
		rangeActive(
			filters.heightEnabled,
			filters.height,
			HEIGHT_CM_MIN,
			HEIGHT_CM_MAX,
		)
	) {
		const inRange = within(filters.height, HEIGHT_CM_MIN, HEIGHT_CM_MAX);
		details.push((facts) => facts.height !== null && inRange(facts.height));
	}
	if (
		rangeActive(
			filters.weightEnabled,
			filters.weight,
			WEIGHT_KG_MIN,
			WEIGHT_KG_MAX,
		)
	) {
		const inRange = within(filters.weight, WEIGHT_KG_MIN, WEIGHT_KG_MAX);
		// Profiles carry grams, the filter speaks kilograms.
		details.push(
			(facts) => facts.weight !== null && inRange(facts.weight / 1000),
		);
	}
	if (
		listActive(
			filters.relationshipStatusesEnabled,
			filters.relationshipStatuses,
		)
	) {
		const one = hasOneOf([...filters.relationshipStatuses]);
		details.push((facts) => one(facts.relationshipStatus));
	}
	if (listActive(filters.acceptNSFWPicsEnabled, filters.acceptNSFWPics)) {
		const one = hasOneOf([...filters.acceptNSFWPics]);
		details.push((facts) => one(facts.nsfw));
	}
	if (listActive(filters.lookingForEnabled, filters.lookingFor)) {
		const any = hasAnyOf([...filters.lookingFor]);
		details.push((facts) => any(facts.lookingFor));
	}
	if (listActive(filters.meetAtEnabled, filters.meetAt)) {
		const any = hasAnyOf([...filters.meetAt]);
		details.push((facts) => any(facts.meetAt));
	}
	if (listActive(filters.healthPracticesEnabled, filters.healthPractices)) {
		const any = hasAnyOf([...filters.healthPractices]);
		details.push((facts) => any(facts.sexualHealth));
	}

	const needs = { live: live.length > 0, details: details.length > 0 };

	return {
		active: needs.live || needs.details,
		needs,
		verdict(facts, now) {
			if (!needs.live && !needs.details) return "match";
			const liveFacts = facts?.live;
			// Say no as soon as anything known says no, before the rest arrives.
			if (liveFacts && live.some((check) => !check(liveFacts, now))) {
				return "no";
			}
			const detailFacts = facts?.details;
			if (needs.details && detailFacts === null) return "no";
			if (
				detailFacts &&
				details.some((check) => !check(detailFacts, liveFacts))
			) {
				return "no";
			}
			if (needs.live && liveFacts === undefined) return "unknown";
			if (needs.details && detailFacts === undefined) return "unknown";
			return "match";
		},
	};
}
