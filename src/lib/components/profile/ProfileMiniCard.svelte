<script lang="ts">
	import { ChatIcon, StarIcon } from "phosphor-svelte";
	import type { Snippet } from "svelte";

	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import { Badge } from "$lib/components/ui/badge";

	let {
		mediaHash = null,
		displayName = null,
		age = null,
		distance = null,
		unread = null,
		onlineUntil = null,
		isFavorite = false,
		isVisiting = false,
		hadRecentChat = false,
		anonymous = false,
		href = null,
		class: className,
		overlay,
		variant = "standard",
		showDistance = true,
		showAge = true,
		showOnlineStatus = true,
	}: {
		mediaHash?: string | null;
		displayName?: string | null;
		age?: number | null;
		distance?: number | null;
		unread?: number | null;
		onlineUntil?: number | null;
		isFavorite?: boolean;
		isVisiting?: boolean;
		hadRecentChat?: boolean;
		anonymous?: boolean;
		href?: string | null;
		class?: import("svelte/elements").ClassValue;
		overlay?: Snippet;
		variant?: "standard" | "compact" | "detailed";
		showDistance?: boolean;
		showAge?: boolean;
		showOnlineStatus?: boolean;
	} = $props();
</script>

{#snippet content()}
	<div class="absolute size-full bg-stone-700">
		<UserAvatar {mediaHash} class="size-full" size="xl" />
	</div>
	{#if showDistance && distance !== null}
		<span class="profile-card-distance absolute top-1 right-1.5">
			<DistanceFormatted {distance} />
		</span>
	{/if}
	{#if isFavorite || hadRecentChat}
		<div
			class="absolute inset-s-2 top-2 z-1 flex w-1/6 flex-col items-center gap-1"
		>
			{#if isFavorite}
				<div class="badge">
					<StarIcon
						weight="fill"
						class="m-auto size-4/6 text-yellow-500"
					/>
					<span class="sr-only">Favorite</span>
				</div>
			{/if}
			{#if hadRecentChat}
				<div class="badge">
					<ChatIcon
						weight="fill"
						class="m-auto size-3/5 -translate-y-px text-sky-400"
					/>
					<span class="sr-only">Chatted recently</span>
				</div>
			{/if}
		</div>
	{/if}
	{#if !anonymous}
		<div class="z-1 flex w-full items-center gap-0.5 p-0.5">
			<Badge
				variant="outline"
				class="max-w-full min-w-0 shrink gap-0 bg-popover/20 scrim backdrop-filter-(--bd-chip)"
			>
				{#if showOnlineStatus}
					<ProfileStatusIndicator
						{onlineUntil}
						{isVisiting}
						class="me-1"
					/>
				{/if}

				<span
					class={[
						"block shrink truncate font-semibold",
						{ "text-foreground/50": !displayName },
					]}
				>
					<DisplayName name={displayName} />
				</span>
				{#if showAge && age !== null}
					,&nbsp;<span
						class="line-clamp-1 block max-w-full shrink-0 truncate"
					>
						{age}
					</span>
				{/if}
			</Badge>
			{#if unread !== null && unread > 0}
				<span
					class="flex size-5 shrink-0 items-center justify-center rounded-full border border-black/20 bg-primary text-2xs font-semibold text-primary-foreground"
				>
					{#if unread > 99}
						<span class="text-3xs">99+</span>
					{:else}
						{unread}
					{/if}
					<span class="sr-only">unread messages</span>
				</span>
			{/if}
		</div>
	{/if}
	{#if variant === "detailed" && !anonymous}
		<div class="pointer-events-none absolute inset-x-2 bottom-2 z-0 flex items-end justify-between gap-2 opacity-90 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
			{#if showDistance && distance !== null}
				<span class="rounded-full bg-black/45 px-2 py-0.5 text-3xs font-medium text-white backdrop-blur">
					<DistanceFormatted {distance} />
				</span>
			{/if}
			{#if isVisiting}
				<span class="rounded-full bg-black/45 px-2 py-0.5 text-3xs font-medium text-white backdrop-blur">Visiting</span>
			{/if}
		</div>
	{/if}
	{@render overlay?.()}
{/snippet}

{#if href !== null}
	<a
		{href}
		aria-label={anonymous ? "Profile" : undefined}
		class={[
			"group profile-card relative flex aspect-square items-end overflow-hidden",
			`profile-card-${variant}`,
			className,
		]}
	>
		{@render content()}
	</a>
{:else}
	<div
		class={[
			"group profile-card relative flex aspect-square items-end overflow-hidden",
			`profile-card-${variant}`,
			className,
		]}
	>
		{@render content()}
	</div>
{/if}

<style lang="postcss">
	@reference "$layout";

	.badge {
		@apply flex aspect-square h-auto w-full rounded-full border border-white/10 bg-popover/40 scrim backdrop-filter-(--bd-chip);
	}

	.profile-card {
		transition:
			transform var(--motion-normal) var(--ease-standard),
			box-shadow var(--motion-normal) var(--ease-standard);
	}

	.profile-card-compact .badge {
		@apply border-white/8 bg-popover/30;
	}

	.profile-card-compact .profile-card-distance {
		@apply text-[0.65rem];
	}

	.profile-card-detailed .badge {
		@apply border-white/15 bg-popover/50;
	}

	@media (hover: hover) and (pointer: fine) {
		.profile-card-detailed:hover {
			transform: translateY(-1px);
			box-shadow: 0 10px 30px -18px rgb(0 0 0 / 70%);
		}
	}
</style>
