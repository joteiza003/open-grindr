<script lang="ts">
	import {
		BellSimpleSlashIcon,
		EyeSlashIcon,
		ListPlusIcon,
		ProhibitIcon,
		StarIcon,
	} from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { blockUser } from "$lib/api/browse/blocks";
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		addFavoriteUser,
		removeFavoriteUser,
	} from "$lib/api/users/favorites";
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import FavoriteListsDialog from "$lib/components/favorites/FavoriteListsDialog.svelte";
	import SilenceDialog from "$lib/components/safety/SilenceDialog.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import { directConversationId } from "$lib/right-now/right-now-post";
	import {
		activeSilence,
		endSilence,
		startSilence,
	} from "$lib/safety/silence-state.svelte";
	import {
		durationMs,
		type SilenceDurationId,
		type SilenceKind,
	} from "$lib/safety/temporary-silence";
	import type { ProfileState } from "./profile-state.svelte";

	let {
		profileState,
		blockable,
	}: { profileState: ProfileState; blockable: boolean } = $props();

	const profileId = $derived(profileState.profileId);
	const isFavorite = $derived(profileState.profile?.isFavorite ?? false);
	const mutedUntil = $derived(
		activeSilence({ profileId, kind: "mute" })?.until ?? null,
	);
	const hiddenUntil = $derived(
		activeSilence({ profileId, kind: "hide" })?.until ?? null,
	);

	let busy = $state(false);
	let dialogKind = $state<SilenceKind | null>(null);
	let dialogOpen = $state(false);
	let blockOpen = $state(false);
	let listsOpen = $state(false);

	const untilText = (until: number) => new Date(until).toLocaleString();

	async function toggleFavorite() {
		if (busy) return;
		busy = true;
		try {
			if (isFavorite) await removeFavoriteUser({ profileId });
			else await addFavoriteUser({ profileId });
			profileState.setFavorite(!isFavorite);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("quick.favoriteFailed"), error });
		} finally {
			busy = false;
		}
	}

	function askSilence(kind: SilenceKind) {
		dialogKind = kind;
		dialogOpen = true;
	}

	async function chooseDuration(duration: SilenceDurationId) {
		const kind = dialogKind;
		if (kind === null || busy) return;
		busy = true;
		const until = Date.now() + durationMs(duration);
		try {
			if (kind === "mute") {
				const conversationId = directConversationId(
					profileState.ourProfileId,
					profileId,
				);
				await getOrCreateConversationsState(
					profileState.ourProfileId,
				).setMuted({ conversationIds: [conversationId], muted: true });
				await startSilence({ profileId, kind, until, conversationId });
				toast.success(
					t("silence.mutedUntil", { when: untilText(until) }),
				);
			} else {
				await startSilence({ profileId, kind, until });
				toast.success(
					t("silence.hiddenUntil", { when: untilText(until) }),
				);
			}
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("silence.failed"), error });
		} finally {
			busy = false;
		}
	}

	async function reactivate(kind: SilenceKind) {
		if (busy) return;
		busy = true;
		try {
			if (kind === "mute") {
				await getOrCreateConversationsState(
					profileState.ourProfileId,
				).setMuted({
					conversationIds: [
						directConversationId(
							profileState.ourProfileId,
							profileId,
						),
					],
					muted: false,
				});
			}
			await endSilence({ profileId, kind });
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("silence.failed"), error });
		} finally {
			busy = false;
		}
	}

	async function block() {
		busy = true;
		try {
			await blockUser({ profileId });
			profileState.markBlocked();
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("quick.blockFailed"), error });
		} finally {
			busy = false;
			blockOpen = false;
		}
	}
</script>

<section
	data-slot="profile-quick-actions"
	aria-label={t("quick.title")}
	class="mb-4 flex flex-col gap-2"
>
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		<Button
			variant="secondary"
			size="sm"
			aria-pressed={isFavorite}
			disabled={busy}
			onclick={() => void toggleFavorite()}
		>
			<StarIcon weight={isFavorite ? "fill" : "bold"} />
			{isFavorite ? t("quick.unfavorite") : t("quick.favorite")}
		</Button>
		<Button
			variant={mutedUntil !== null ? "default" : "secondary"}
			size="sm"
			aria-pressed={mutedUntil !== null}
			disabled={busy}
			onclick={() =>
				mutedUntil !== null
					? void reactivate("mute")
					: askSilence("mute")}
		>
			<BellSimpleSlashIcon
				weight={mutedUntil !== null ? "fill" : "bold"}
			/>
			{mutedUntil !== null ? t("quick.unmute") : t("quick.mute")}
		</Button>
		<Button
			variant={hiddenUntil !== null ? "default" : "secondary"}
			size="sm"
			aria-pressed={hiddenUntil !== null}
			disabled={busy}
			onclick={() =>
				hiddenUntil !== null
					? void reactivate("hide")
					: askSilence("hide")}
		>
			<EyeSlashIcon weight={hiddenUntil !== null ? "fill" : "bold"} />
			{hiddenUntil !== null ? t("quick.unhide") : t("quick.hide")}
		</Button>
		<Button
			variant="secondary"
			size="sm"
			disabled={busy}
			onclick={() => (listsOpen = true)}
		>
			<ListPlusIcon weight="bold" />
			{t("lists.addTo")}
		</Button>
		{#if blockable}
			<Button
				variant="secondary"
				size="sm"
				class="text-destructive"
				disabled={busy}
				onclick={() => (blockOpen = true)}
			>
				<ProhibitIcon weight="bold" />
				{t("quick.block")}
			</Button>
		{/if}
	</div>
	{#if mutedUntil !== null}
		<p class="text-xs text-muted-foreground">
			{t("silence.mutedUntil", { when: untilText(mutedUntil) })}
		</p>
	{/if}
	{#if hiddenUntil !== null}
		<p class="text-xs text-muted-foreground">
			{t("silence.hiddenUntil", { when: untilText(hiddenUntil) })}
		</p>
	{/if}
</section>

<FavoriteListsDialog bind:open={listsOpen} {profileId} />

{#if dialogKind !== null}
	<SilenceDialog
		bind:open={dialogOpen}
		kind={dialogKind}
		onChoose={(duration) => void chooseDuration(duration)}
	/>
{/if}

<AlertDialog.Root bind:open={blockOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("quick.blockTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("quick.blockBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg"
				>{t("common.cancel")}</AlertDialog.Cancel
			>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void block()}
			>
				{t("quick.block")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
