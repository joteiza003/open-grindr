<script lang="ts">
	import MapPinIcon from "phosphor-svelte/lib/MapPinIcon";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		locationMessageDraft,
		resolveChatLocation,
	} from "$lib/chat/send-chat-location";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import { getMessageComposerContext } from "../message-composer-context.svelte";

	let {
		disabled = false,
		open = $bindable(false),
	}: { disabled?: boolean; open?: boolean } = $props();

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
			open = false;
			await composer().sendMessages([locationMessageDraft(outcome.fix)]);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("chat.sendLocationFailed"), error });
		} finally {
			sending = false;
		}
	}
</script>

<Button
	type="button"
	variant="ghost"
	size="icon"
	class="size-9 shrink-0 rounded-full"
	aria-label={t("chat.location")}
	title={t("chat.location")}
	{disabled}
	onclick={() => (open = true)}
>
	<MapPinIcon
		weight="fill"
		class="size-4.5"
		color="var(--muted-foreground)"
	/>
</Button>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("chat.sendLocationTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("chat.sendLocationBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel
				size="lg"
				disabled={sending}
				onclick={() => (open = false)}
			>
				{t("common.cancel")}
			</AlertDialog.Cancel>
			<AlertDialog.Action
				size="lg"
				disabled={sending}
				onclick={() => void confirmSend()}
			>
				{t("chat.sendLocation")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
