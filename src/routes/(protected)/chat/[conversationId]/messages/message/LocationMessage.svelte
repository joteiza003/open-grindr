<script lang="ts">
	import { CaretRightIcon, MapPinIcon } from "phosphor-svelte";

	import { captureLocationMessage } from "$lib/chat/capture-location";
	import { getConversationState } from "../../conversation-state.svelte";

	let {
		lat,
		lon,
		senderId,
		conversationId,
		messageId,
		timestamp,
		isOut,
	}: {
		lat: number;
		lon: number;
		senderId: number;
		conversationId: string;
		messageId: string;
		timestamp: number;
		isOut: boolean;
	} = $props();

	const conversationState = $derived(getConversationState()());

	// Automatically index locations others share with us as they appear.
	// upsert dedupes, so re-rendering the same message is harmless.
	$effect(() => {
		if (isOut) return;
		captureLocationMessage(
			{ conversationId, messageId, senderId, timestamp, lat, lon },
			conversationState.profile?.name ?? null,
		);
	});
</script>

<a
	href="/map"
	class="ms-3 flex w-fit max-w-70 items-center gap-3 rounded-xl bg-muted p-3 text-muted-foreground"
>
	<span
		class="grid size-9 shrink-0 place-items-center rounded-full bg-background/40"
	>
		<MapPinIcon class="size-5" weight="fill" />
	</span>
	<span class="flex min-w-0 flex-col">
		<span class="font-medium text-foreground">Shared location</span>
		<span class="text-xs">
			{lat.toFixed(4)}, {lon.toFixed(4)} · View on map
		</span>
	</span>
	<CaretRightIcon class="size-4 shrink-0" />
</a>
