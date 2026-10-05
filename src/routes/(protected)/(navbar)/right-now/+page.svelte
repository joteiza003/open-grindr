<script lang="ts">
	import { goto } from "$app/navigation";
	import {
		ArrowClockwiseIcon,
		HandWavingIcon,
		LightningIcon,
	} from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { sendMessage } from "$lib/api/messaging/messages";
	import {
		hydratePreferences,
		preferencesSnapshot,
	} from "$lib/app-data/preferences.svelte";
	import ApiErrorDisplay from "$lib/components/feedback/ApiErrorDisplay.svelte";
	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import MediaImage from "$lib/components/shared/MediaImage.svelte";
	import RelativeTimeDynamic from "$lib/components/shared/RelativeTimeDynamic.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { GREETING_MESSAGES } from "$lib/grid/tinder-deck";
	import { t } from "$lib/i18n";
	import { rightNowFeed } from "$lib/right-now/right-now-feed.svelte";
	import {
		directConversationId,
		type RightNowPost,
	} from "$lib/right-now/right-now-post";
	import LocationChooser from "../(root)/LocationEmpty.svelte";

	let { data }: { data: { ourProfileId: number } } = $props();

	const preferencesHydrated = hydratePreferences();
	const geohash = $derived(preferencesSnapshot().geohash);

	let greeting = $state<number | null>(null);

	$effect(() => {
		if (geohash && !rightNowFeed.loaded && !rightNowFeed.loading) {
			void rightNowFeed.load(geohash);
		}
	});

	function refresh() {
		if (geohash) void rightNowFeed.load(geohash);
	}

	async function sayHi(post: RightNowPost) {
		if (greeting !== null) return;
		greeting = post.profileId;
		try {
			const [text] = GREETING_MESSAGES;
			await sendMessage({
				toUserId: post.profileId,
				message: { type: "Text", body: { text } },
			});
			await goto(
				`/chat/${directConversationId(data.ourProfileId, post.profileId)}`,
			);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("rightNow.hiFailed"), error });
		} finally {
			greeting = null;
		}
	}

	function openProfile(post: RightNowPost) {
		void goto(`/profile/${post.profileId}`, {
			state: { profileOrigin: "browse" },
		});
	}
</script>

<svelte:head>
	<title>{t("nav.rightNow")}</title>
</svelte:head>
{#await preferencesHydrated then}
	{#if geohash === null}
		<main class="m-auto flex max-w-full flex-1">
			<LocationChooser />
		</main>
	{:else}
		<main class="screen-nav-host">
			<div class="flex w-full flex-col gap-3 p-4 pb-nav-clear">
				<div class="mx-auto flex w-full max-w-120 flex-col gap-3">
					<header class="flex items-start justify-between gap-3">
						<div class="flex min-w-0 flex-col gap-1">
							<h1
								class="flex items-center gap-2 text-xl font-semibold"
							>
								<LightningIcon
									weight="fill"
									class="size-6 text-primary"
								/>
								{t("nav.rightNow")}
							</h1>
							<p class="text-sm text-muted-foreground">
								{t("rightNow.intro")}
							</p>
						</div>
						<Button
							variant="secondary"
							size="icon"
							aria-label={t("rightNow.refresh")}
							disabled={rightNowFeed.loading}
							onclick={refresh}
						>
							<ArrowClockwiseIcon
								class={{ "animate-spin": rightNowFeed.loading }}
							/>
						</Button>
					</header>

					<p
						class="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
						data-slot="right-now-limits"
					>
						{t("rightNow.limits")}
					</p>

					{#if rightNowFeed.error && rightNowFeed.posts.length === 0}
						<ApiErrorDisplay
							error={rightNowFeed.error}
							onRetry={refresh}
							class="m-auto"
						/>
					{:else if rightNowFeed.loading && rightNowFeed.posts.length === 0}
						{#each [0, 1, 2] as index (index)}
							<Skeleton class="h-40 w-full rounded-2xl" />
						{/each}
					{:else if rightNowFeed.posts.length === 0}
						<div
							class="flex flex-col gap-1 rounded-2xl border border-border p-4"
							data-slot="right-now-empty"
						>
							<p class="font-medium">{t("rightNow.empty")}</p>
							<p class="text-sm text-muted-foreground">
								{t("rightNow.emptyHint")}
							</p>
						</div>
					{:else}
						<ul class="flex flex-col gap-3">
							{#each rightNowFeed.posts as post (post.profileId)}
								<li
									class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs"
									data-slot="right-now-post"
								>
									<button
										type="button"
										class="flex items-center gap-3 text-start"
										onclick={() => openProfile(post)}
									>
										<span
											class="size-12 shrink-0 overflow-hidden rounded-full"
										>
											<UserAvatar
												mediaHash={post.mediaHash}
												class="size-12"
												size="md"
											/>
										</span>
										<span class="flex min-w-0 flex-col">
											<span
												class="flex items-center gap-1 font-semibold"
											>
												<DisplayName
													name={post.displayName}
													class="truncate"
												/>
												{#if post.age !== null}
													<span class="font-normal"
														>{post.age}</span
													>
												{/if}
											</span>
											<span
												class="flex items-center gap-2 text-xs text-muted-foreground"
											>
												{#if post.distance !== null}
													<DistanceFormatted
														distance={post.distance}
													/>
												{/if}
												{#if post.postedAt !== null}
													<RelativeTimeDynamic
														date={post.postedAt}
													/>
												{/if}
											</span>
										</span>
									</button>
									{#if post.text}
										<p
											class="text-sm wrap-anywhere whitespace-pre-line"
										>
											{post.text}
										</p>
									{/if}
									{#if post.thumbnailUrl}
										<MediaImage
											src={post.thumbnailUrl}
											class="max-h-72 w-full overflow-hidden rounded-xl"
											imgClass="object-cover"
											tone="photo"
											size="lg"
											loading="lazy"
										/>
									{/if}
									<div class="flex gap-2">
										<Button
											class="flex-1"
											disabled={greeting !== null}
											onclick={() => void sayHi(post)}
										>
											<HandWavingIcon weight="fill" />
											{t("rightNow.sayHi")}
										</Button>
										<Button
											variant="secondary"
											onclick={() => openProfile(post)}
										>
											{t("rightNow.viewProfile")}
										</Button>
									</div>
								</li>
							{/each}
						</ul>
						{#if rightNowFeed.hasMore}
							<Button
								variant="outline"
								disabled={rightNowFeed.loadingMore}
								onclick={() => void rightNowFeed.loadMore()}
							>
								{t("rightNow.loadMore")}
							</Button>
						{/if}
					{/if}
				</div>
			</div>
		</main>
	{/if}
{/await}
