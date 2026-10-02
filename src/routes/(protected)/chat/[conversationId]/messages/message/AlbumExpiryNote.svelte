<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import { shareAlbum } from "$lib/api/messaging/albums";
	import { albumShares } from "$lib/chat/album-shares.svelte";
	import { albumExpiryInfo, canRenewAlbum } from "$lib/chat/album-expiry";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import type { AlbumExpirationType } from "$lib/model/messaging/albums";
	import type { AlbumMessage } from "$lib/model/messaging/messages";
	import { getConversationState } from "../../conversation-state.svelte";

	let { message }: { message: AlbumMessage["body"] } = $props();

	const conversationState = $derived(getConversationState()());
	const peerProfileId = $derived(
		conversationState.profile?.profileId ?? null,
	);
	const isOwner = $derived(
		message.ownerProfileId !== null &&
			message.ownerProfileId === conversationState.ourProfileId,
	);

	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const info = $derived(albumExpiryInfo(message, now));
	let renewing = $state(false);

	async function renew() {
		if (renewing || peerProfileId === null) return;
		renewing = true;
		// Se renueva con el mismo plazo; si no se conoce, un día.
		const expirationType: AlbumExpirationType =
			message.expirationType &&
			message.expirationType !== "INDEFINITE" &&
			message.expirationType !== "ONCE"
				? message.expirationType
				: "ONE_DAY";
		try {
			await shareAlbum({
				albumId: message.albumId,
				profileIds: [peerProfileId],
				expirationType,
			});
			albumShares.set({
				albumId: message.albumId,
				profileId: peerProfileId,
				shared: true,
			});
			toast.success(t("album.renewed"));
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("album.renewFailed"), error });
		} finally {
			renewing = false;
		}
	}
</script>

{#if info.state !== "none"}
	<div
		data-slot="album-expiry"
		class="mt-1 flex items-center gap-2 text-xs text-muted-foreground"
	>
		<span>
			{info.state === "active"
				? t("album.expiresIn", { time: info.label })
				: t("album.expired")}
		</span>
		{#if canRenewAlbum({ info, isOwner }) && peerProfileId !== null}
			<Button
				variant="ghost"
				size="sm"
				class="h-6 px-2 text-xs"
				disabled={renewing}
				onclick={() => void renew()}
			>
				{t("album.renew")}
			</Button>
		{/if}
	</div>
{/if}
