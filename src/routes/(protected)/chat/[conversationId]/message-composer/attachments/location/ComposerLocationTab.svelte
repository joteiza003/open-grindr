<script lang="ts">
	import MapPinIcon from "phosphor-svelte/lib/MapPinIcon";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		locationMessageDraft,
		resolveChatLocation,
	} from "$lib/chat/send-chat-location";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import { getMessageComposerContext } from "../../message-composer-context.svelte";

	let { onClose }: { onClose: () => void } = $props();

	const composer = getMessageComposerContext();
	let sending = $state(false);

	async function confirmSend() {
		if (sending) return;
		sending = true;
		try {
			const outcome = await resolveChatLocation();
			if (!outcome.ok) {
				if (!outcome.aborted) {
					showErrorToast({
						label: outcome.reason,
						error: new Error(outcome.reason),
					});
				}
				return;
			}
			onClose();
			await composer().sendMessages([locationMessageDraft(outcome.fix)]);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("chat.sendLocationFailed"), error });
		} finally {
			sending = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-3 py-6 text-center">
	<span class="grid size-12 place-items-center rounded-full bg-muted">
		<MapPinIcon class="size-6" weight="fill" />
	</span>
	<div>
		<p class="font-medium">{t("chat.sendLocationTitle")}</p>
		<p class="mt-1 max-w-70 text-sm text-muted-foreground">
			{t("chat.sendLocationBody")}
		</p>
	</div>
	<div class="flex gap-2">
		<Button variant="outline" onclick={onClose} disabled={sending}>
			{t("common.cancel")}
		</Button>
		<Button onclick={() => void confirmSend()} disabled={sending}>
			{t("chat.sendLocation")}
		</Button>
	</div>
</div>
