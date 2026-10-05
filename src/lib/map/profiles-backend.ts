import { SvelteMap } from "svelte/reactivity";

import {
	getProfile,
	getProfiles,
	isUnviewableProfileError,
} from "$lib/api/users/profiles";
import {
	type DetailFacts,
	detailFactsOf,
	type LiveFacts,
	liveFactsOf,
} from "./profile-facts";

/** Where the map gets what it knows about the profiles behind its pins. */
export type ProfilesBackend = {
	/** Short lookup of several profiles at once. Profiles the server does not return are left out. */
	lookup: (ids: number[]) => Promise<ReadonlyMap<number, LiveFacts>>;
	/** The full profile; null when it cannot be viewed (blocked, hidden, gone). */
	details: (id: number) => Promise<DetailFacts | null>;
};

export const apiProfilesBackend: ProfilesBackend = {
	async lookup(ids) {
		const profiles = await getProfiles(ids);
		return new SvelteMap(
			profiles.map((profile) => [
				profile.profileId,
				liveFactsOf(profile),
			]),
		);
	},
	async details(id) {
		try {
			return detailFactsOf(await getProfile(id));
		} catch (error) {
			if (isUnviewableProfileError(error)) return null;
			throw error;
		}
	},
};
