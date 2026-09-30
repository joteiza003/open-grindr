<script lang="ts">
	import { goto } from "$app/navigation";
	import { HeartIcon, StarIcon, XIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { addFavoriteUser } from "$lib/api/users/favorites";
	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import ApiErrorDisplay from "$lib/components/feedback/ApiErrorDisplay.svelte";
	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserSilhouette from "$lib/components/profile/UserSilhouette.svelte";
	import MediaImage from "$lib/components/shared/MediaImage.svelte";
	import { Button } from "$lib/components/ui/button";
	import { greetProfile } from "$lib/grid/greet";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import {
		acceptProfile,
		decidedProfileIds,
		rejectProfile,
		resetDecisions,
	} from "$lib/grid/swipe-decisions";
	import {
		needsMoreProfiles,
		TINDER_RADIUS_OPTIONS_KM,
		tinderCandidates,
	} from "$lib/grid/tinder-deck";
	import { t } from "$lib/i18n";
	import { profileMediaUrl } from "$lib/util/media";
	import { formatDistance } from "$lib/util/units";

	const SWIPE_THRESHOLD_PX = 110;
	const LEAVE_MS = 220;

	let { geohash }: { geohash: string } = $props();

	const browse = $derived(preferencesSnapshot().browse);
	const units = $derived(preferencesSnapshot().units);
	const radiusKm = $derived(browse.tinderRadiusKm);

	const candidates = $derived(
		tinderCandidates({
			profiles: gridState.profiles,
			radiusKm,
			decided: decidedProfileIds(),
		}),
	);
	const current = $derived(candidates[0] ?? null);
	const upcoming = $derived(candidates[1] ?? null);

	$effect.pre(() => {
		gridState.load(geohash);
	});

	$effect(() => {
		gridState.viewActive = true;
		return () => {
			gridState.viewActive = false;
		};
	});

	// Los perfiles "perezosos" no traen distancia ni foto hasta resolverlos.
	$effect(() => {
		const pending = gridState.profiles
			.filter((profile) => profile.type === "lazy")
			.slice(0, 8);
		for (const profile of pending) {
			gridState.resolveProfile(profile.id).catch(console.error);
		}
	});

	$effect(() => {
		if (gridState.loading || gridState.loadingMore) return;
		if (gridState.nextPage === null || gridState.nextPage === 0) return;
		if (
			needsMoreProfiles({
				profiles: gridState.profiles,
				radiusKm,
				candidateCount: candidates.length,
			})
		) {
			void gridState.loadMore();
		}
	});

	let dx = $state(0);
	let dragging = $state(false);
	let leaving = $state<"left" | "right" | null>(null);
	let busy = $state(false);
	let startX = 0;
	let moved = false;

	const rotation = $derived(
		leaving === "right"
			? 18
			: leaving === "left"
				? -18
				: Math.max(-14, Math.min(14, dx / 14)),
	);
	const offset = $derived(
		leaving === "right" ? 600 : leaving === "left" ? -600 : dx,
	);
	const acceptOpacity = $derived(Math.max(0, Math.min(1, dx / 90)));
	const rejectOpacity = $derived(Math.max(0, Math.min(1, -dx / 90)));

	function reset() {
		leaving = null;
		dx = 0;
	}

	type Decision = "reject" | "accept" | "favorite";

	const leave = (direction: "left" | "right") =>
		new Promise<void>((resolve) => {
			leaving = direction;
			setTimeout(resolve, LEAVE_MS);
		});

	async function decide(decision: Decision): Promise<void> {
		const profile = current;
		if (!profile || busy) return;
		busy = true;
		try {
			if (decision === "reject") {
				await leave("left");
				await rejectProfile(profile.id);
			} else {
				// Con la tarjeta aún visible: si el envío falla, sigue ahí.
				if (decision === "favorite") {
					await addFavoriteUser({ profileId: profile.id });
					gridState.setFavorite({
						profileId: profile.id,
						isFavorite: true,
					});
				}
				await greetProfile(profile.id);
				await leave("right");
				await acceptProfile(profile.id);
			}
		} catch (error) {
			console.error(error);
			reset();
			showErrorToast({ label: t("browse.tinder.greetFailed"), error });
		} finally {
			busy = false;
		}
	}

	// La siguiente tarjeta entra limpia, sin heredar el desplazamiento.
	$effect(() => {
		void current?.id;
		reset();
	});

	function onPointerDown(event: PointerEvent) {
		if (busy || event.button > 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		moved = false;
		startX = event.clientX;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		dx = event.clientX - startX;
		if (Math.abs(dx) > 6) moved = true;
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (dx > SWIPE_THRESHOLD_PX) void decide("accept");
		else if (dx < -SWIPE_THRESHOLD_PX) void decide("reject");
		else dx = 0;
	}

	function openProfile() {
		if (moved || !current) return;
		void goto(`/profile/${current.id}`, {
			state: { profileOrigin: "browse" },
		});
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			void decide("reject");
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			void decide("accept");
		} else if (event.key === "Enter") {
			event.preventDefault();
			openProfile();
		}
	}

	async function chooseRadius(km: number): Promise<void> {
		if (km === radiusKm) return;
		await setPreferences({ browse: { ...browse, tinderRadiusKm: km } });
	}

	const radiusLabel = $derived(formatDistance(radiusKm * 1000, units));
	const loadingDeck = $derived(
		(gridState.loading || gridState.loadingMore) && current === null,
	);
	const hasDecisions = $derived(
		browse.rejectedProfileIds.length + browse.acceptedProfileIds.length > 0,
	);
</script>

<div
	data-slot="tinder-deck"
	class="flex h-full min-h-0 flex-1 flex-col gap-3 px-4 pt-header-clear-17 pb-nav-clear"
>
	<div
		role="radiogroup"
		aria-label={t("browse.tinder.radiusAria")}
		data-scroll-intent="x"
		class="scrollbar-thin flex shrink-0 items-center gap-1.5 overflow-x-auto"
	>
		<span class="shrink-0 text-xs font-medium text-muted-foreground">
			{t("browse.tinder.radius")}
		</span>
		{#each TINDER_RADIUS_OPTIONS_KM as km (km)}
			<button
				type="button"
				role="radio"
				aria-checked={km === radiusKm}
				class="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
				onclick={() => void chooseRadius(km)}
			>
				{formatDistance(km * 1000, units)}
			</button>
		{/each}
	</div>

	<div class="relative flex min-h-0 flex-1 items-center justify-center">
		{#if gridState.error && gridState.profiles.length === 0}
			<ApiErrorDisplay
				error={gridState.error}
				onRetry={() => gridState.retry()}
				class="m-auto"
			/>
		{:else if loadingDeck}
			<div
				role="status"
				class="aspect-3/4 max-h-full w-full max-w-sm animate-pulse rounded-3xl bg-muted/60"
			>
				<span class="sr-only">{t("browse.tinder.loading")}</span>
			</div>
		{:else if current === null}
			<div
				class="flex max-w-sm flex-col items-center gap-3 text-center"
				data-slot="tinder-empty"
			>
				<p class="text-lg font-semibold">
					{t("browse.tinder.empty", { distance: radiusLabel })}
				</p>
				<p class="text-sm text-muted-foreground">
					{t("browse.tinder.emptyHint")}
				</p>
				{#if hasDecisions}
					<Button
						variant="secondary"
						onclick={() => void resetDecisions()}
					>
						{t("browse.tinder.reset")}
					</Button>
				{/if}
			</div>
		{:else}
			{#if upcoming}
				<div
					class="absolute aspect-3/4 max-h-full w-full max-w-sm scale-95 overflow-hidden rounded-3xl bg-muted opacity-70"
					aria-hidden="true"
				>
					{#if upcoming.profilePhotosHashes?.[0]}
						<MediaImage
							src={profileMediaUrl({
								mediaHash: upcoming.profilePhotosHashes[0],
								size: "thumb",
							})}
							class="size-full"
							tone="photo"
							loading="lazy"
						/>
					{/if}
				</div>
			{/if}

			{#key current.id}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					role="group"
					tabindex="0"
					aria-label={current.displayName ??
						t("browse.tinder.openProfile")}
					data-slot="tinder-card"
					class="relative aspect-3/4 max-h-full w-full max-w-sm touch-pan-y overflow-hidden rounded-3xl bg-muted shadow-xl outline-none select-none"
					style:transform="translateX({offset}px) rotate({rotation}deg)"
					style:transition={dragging
						? "none"
						: `transform ${LEAVE_MS}ms ease-out`}
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
					onclick={openProfile}
					onkeydown={onKeydown}
				>
					{#if current.profilePhotosHashes?.[0]}
						<MediaImage
							src={profileMediaUrl({
								mediaHash: current.profilePhotosHashes[0],
								size: "full",
							})}
							class="size-full"
							imgClass="object-cover"
							tone="photo"
							size="xl"
							loading="eager"
						/>
					{:else}
						<div class="flex size-full items-center justify-center">
							<UserSilhouette
								class="m-auto size-1/2 text-muted-foreground"
							/>
						</div>
					{/if}
					<div
						class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/80 to-transparent"
					></div>
					<div
						class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4 text-white"
					>
						<span
							class="flex items-center gap-2 text-2xl font-semibold"
						>
							<ProfileStatusIndicator
								onlineUntil={current.onlineUntil}
								isVisiting={current.isVisiting}
							/>
							<DisplayName name={current.displayName} />
							{#if typeof current.age === "number"}
								<span class="font-normal">{current.age}</span>
							{/if}
						</span>
						{#if current.distance !== null}
							<span class="text-sm text-white/80">
								<DistanceFormatted
									distance={current.distance}
								/>
							</span>
						{/if}
					</div>
					<span
						class="pointer-events-none absolute start-4 top-4 -rotate-12 rounded-lg border-4 border-emerald-400 px-2 py-0.5 text-2xl font-black text-emerald-400"
						style:opacity={acceptOpacity}
						aria-hidden="true"
					>
						{t("browse.tinder.accept").toUpperCase()}
					</span>
					<span
						class="pointer-events-none absolute end-4 top-4 rotate-12 rounded-lg border-4 border-red-500 px-2 py-0.5 text-2xl font-black text-red-500"
						style:opacity={rejectOpacity}
						aria-hidden="true"
					>
						{t("browse.tinder.reject").toUpperCase()}
					</span>
				</div>
			{/key}
		{/if}
	</div>

	<div class="flex shrink-0 items-center justify-center gap-5 pb-1">
		<Button
			variant="secondary"
			size="icon-lg"
			class="size-16 rounded-full border-2 border-red-500/60 text-red-500"
			aria-label={t("browse.tinder.reject")}
			title={t("browse.tinder.reject")}
			disabled={current === null || busy}
			onclick={() => void decide("reject")}
		>
			<XIcon weight="bold" class="size-8" />
		</Button>
		<Button
			variant="ghost"
			size="icon-lg"
			class="size-11 rounded-full text-muted-foreground"
			aria-label={t("browse.tinder.favorite")}
			title={t("browse.tinder.favorite")}
			disabled={current === null || busy}
			onclick={() => void decide("favorite")}
		>
			<StarIcon weight="fill" class="size-5 text-yellow-500" />
		</Button>
		<Button
			variant="secondary"
			size="icon-lg"
			class="size-16 rounded-full border-2 border-emerald-500/60 text-emerald-500"
			aria-label={t("browse.tinder.accept")}
			title={t("browse.tinder.accept")}
			disabled={current === null || busy}
			onclick={() => void decide("accept")}
		>
			<HeartIcon weight="fill" class="size-8" />
		</Button>
	</div>
</div>
