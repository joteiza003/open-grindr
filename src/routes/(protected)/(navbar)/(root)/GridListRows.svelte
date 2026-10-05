<script lang="ts">
	import { goto } from "$app/navigation";
	import { ChatIcon, StarIcon } from "phosphor-svelte";

	import ApiErrorDisplay from "$lib/components/feedback/ApiErrorDisplay.svelte";
	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { t } from "$lib/i18n";
	import { observeIntersection } from "$lib/util/observe-intersection";
	import { isPlainClick } from "$lib/util/plain-click";
	import EmptyGrid from "./EmptyGrid.svelte";

	const SKELETON_ROWS = 10;

	function open(event: MouseEvent, id: number) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		void goto(`/profile/${id}`, { state: { profileOrigin: "browse" } });
	}
</script>

<div data-slot="grid-list" class="flex flex-1 flex-col gap-1">
	{#if gridState.loading && gridState.profiles.length === 0}
		{#each { length: SKELETON_ROWS }, index (index)}
			<div class="h-18 animate-pulse rounded-2xl bg-muted/60"></div>
		{/each}
	{:else if gridState.error && gridState.profiles.length === 0}
		<div class="flex p-4">
			<ApiErrorDisplay
				error={gridState.error}
				onRetry={() => gridState.retry()}
				class="m-auto"
			/>
		</div>
	{:else}
		{#if gridState.profiles.length === 0}
			<EmptyGrid />
		{/if}
		{#each gridState.profiles as item (item.id)}
			{#if item.type === "rendered"}
				<a
					href="/profile/{item.id}"
					onclick={(event) => open(event, item.id)}
					class="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors active:bg-muted can-hover:hover:bg-muted/60"
				>
					<UserAvatar
						mediaHash={item.profilePhotosHashes?.[0] ?? null}
						class="size-14 shrink-0 overflow-hidden rounded-full"
						size="md"
					/>
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="flex min-w-0 items-center gap-1.5">
							<ProfileStatusIndicator
								onlineUntil={item.onlineUntil}
								isVisiting={item.isVisiting}
							/>
							<span class="truncate font-semibold">
								<DisplayName name={item.displayName} />
							</span>
							{#if typeof item.age === "number"}
								<span class="shrink-0 text-muted-foreground">
									{item.age}
								</span>
							{/if}
						</span>
						<span
							class="flex items-center gap-2 text-sm text-muted-foreground"
						>
							{#if item.distance !== null}
								<span class="tabular-nums">
									<DistanceFormatted
										distance={item.distance}
									/>
								</span>
							{/if}
							{#if item.isFavorite}
								<StarIcon
									weight="fill"
									class="size-4 text-yellow-500"
									aria-label="Favorite"
								/>
							{/if}
							{#if item.hasChattedInLast24Hrs}
								<ChatIcon
									weight="fill"
									class="size-4 text-sky-400"
									aria-label="Chatted recently"
								/>
							{/if}
						</span>
					</span>
					{#if item.unread !== null && item.unread > 0}
						<span
							class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground"
							title={t("browse.list.unread", {
								count: item.unread,
							})}
						>
							{item.unread > 99 ? "99+" : item.unread}
						</span>
					{/if}
				</a>
			{:else}
				<div
					class="h-18 animate-pulse rounded-2xl bg-muted/60"
					use:observeIntersection={{
						handle: () => {
							gridState
								.resolveProfile(item.id)
								.catch((error) => console.error(error));
						},
						rootMargin: "200px",
					}}
				></div>
			{/if}
		{/each}
	{/if}
</div>
