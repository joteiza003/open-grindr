<script lang="ts">
	import { ListIcon } from "phosphor-svelte";

	import { favoriteLists } from "$lib/favorites/lists-state.svelte";
	import { t } from "$lib/i18n";

	let { profileId, onOpen }: { profileId: number; onOpen: () => void } =
		$props();

	const memberOf = $derived(
		favoriteLists().filter((list) => list.profileIds.includes(profileId)),
	);
</script>

{#if memberOf.length > 0}
	<div
		data-slot="profile-list-chips"
		class="flex flex-wrap items-center gap-1.5"
		role="group"
		aria-label={t("profile.lists.in")}
	>
		<ListIcon class="size-4 shrink-0 text-muted-foreground" />
		{#each memberOf as list (list.id)}
			<button
				type="button"
				class="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium transition-colors active:bg-muted"
				onclick={onOpen}
			>
				{list.name}
			</button>
		{/each}
	</div>
{/if}
