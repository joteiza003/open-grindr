<script lang="ts">
	import { env } from "$env/dynamic/public";
	import { ChatIcon, StarIcon } from "phosphor-svelte";
	import type { Snippet } from "svelte";

	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import Frost from "$lib/components/shared/Frost.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { longPressHandlers } from "$lib/util/long-press";
	import { profileMediaUrl } from "$lib/util/media";

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
		onclick,
		onLongPress,
		class: className,
		overlay,
		variant = "standard",
		showName = true,
		showDistance = true,
		showAge = true,
		showOnlineStatus = true,
		nameStyle = "solid",
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
		onclick?: (event: MouseEvent) => void;
		/** Pulsación larga (táctil) o clic derecho (ratón). */
		onLongPress?: () => void;
		class?: import("svelte/elements").ClassValue;
		overlay?: Snippet<[string | null]>;
		variant?: "standard" | "compact" | "detailed";
		showName?: boolean;
		showDistance?: boolean;
		showAge?: boolean;
		showOnlineStatus?: boolean;
		nameStyle?: "solid" | "gradient" | "none";
	} = $props();

	const nameVisible = $derived(showName && nameStyle !== "none");
	const longPress = $derived(
		onLongPress ? longPressHandlers(onLongPress) : {},
	);

	let loadedMediaHash = $state<string | null>(null);
	const photo = $derived(
		!env.PUBLIC_ENABLE_BLUR_EFFECTS &&
			mediaHash !== null &&
			loadedMediaHash === mediaHash
			? profileMediaUrl({ mediaHash, size: "thumb" })
			: null,
	);
</script>

{#snippet content()}
	<div class="absolute size-full bg-stone-700">
		<UserAvatar
			{mediaHash}
			class="size-full"
			size="xl"
			onload={() => (loadedMediaHash = mediaHash)}
		/>
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
				<div
					class="relative flex aspect-square h-auto w-full media-chip"
				>
					<Frost
						src={photo}
						blur="chip"
						class="-inset-px"
						photoClass="-inset-s-2 -top-2"
					/>
					<StarIcon
						weight="fill"
						class="m-auto size-4/6 text-yellow-500"
					/>
					<span class="sr-only">Favorite</span>
				</div>
			{/if}
			{#if hadRecentChat}
				<div
					class="relative flex aspect-square h-auto w-full media-chip"
				>
					<Frost
						src={photo}
						blur="chip"
						class="-inset-px"
						photoClass={[
							"-inset-s-2",
							isFavorite
								? "top-[calc(-0.75rem-100cqw/6)]"
								: "-top-2",
						]}
					/>
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
		{#if nameVisible && nameStyle === "gradient"}
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-2/5 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
			></div>
		{/if}
		<div class="z-1 flex w-full items-center gap-0.5 p-0.5">
			{#if nameVisible && nameStyle === "gradient"}
				<span
					class="flex min-w-0 shrink items-center gap-0 px-1 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.7)]"
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
							{ "text-white/60": !displayName },
						]}
					>
						<DisplayName name={displayName} />
					</span>
					{#if showAge && age !== null}
						,&nbsp;<span class="block shrink-0 truncate">{age}</span
						>
					{/if}
				</span>
			{:else if nameVisible}
				<Badge
					variant="outline"
					class="relative max-w-full min-w-0 shrink gap-0 overflow-visible media-pill"
				>
					<Frost
						src={photo}
						blur="pill"
						class="-inset-px"
						photoClass="-inset-s-0.5 -bottom-0.5"
					/>
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
			{/if}
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
		<div
			class="pointer-events-none absolute inset-x-2 bottom-2 z-0 flex items-end justify-between gap-2 opacity-90 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
		>
			{#if showDistance && distance !== null}
				<span
					class="rounded-full bg-black/45 px-2 py-0.5 text-3xs font-medium text-white backdrop-filter-(--bd-chip)"
				>
					<DistanceFormatted {distance} />
				</span>
			{/if}
			{#if isVisiting}
				<span
					class="rounded-full bg-black/45 px-2 py-0.5 text-3xs font-medium text-white backdrop-filter-(--bd-chip)"
					>Visiting</span
				>
			{/if}
		</div>
	{/if}
	{@render overlay?.(photo)}
{/snippet}

{#if href !== null}
	<a
		{href}
		{onclick}
		{...longPress}
		aria-label={anonymous ? "Profile" : undefined}
		class={[
			"group profile-card @container relative flex aspect-square items-end overflow-hidden",
			`profile-card-${variant}`,
			className,
		]}
	>
		{@render content()}
	</a>
{:else}
	<div
		class={[
			"group profile-card @container relative flex aspect-square items-end overflow-hidden",
			`profile-card-${variant}`,
			className,
		]}
	>
		{@render content()}
	</div>
{/if}

<style lang="postcss">
	@reference "$layout";

	.profile-card {
		transition:
			transform var(--motion-normal) var(--ease-standard),
			box-shadow var(--motion-normal) var(--ease-standard);
	}

	.profile-card-compact .profile-card-distance {
		@apply text-[0.65rem];
	}

	@media (hover: hover) and (pointer: fine) {
		.profile-card-detailed:hover {
			transform: translateY(-1px);
			box-shadow: 0 10px 30px -18px rgb(0 0 0 / 70%);
		}
	}
</style>
