<script lang="ts">
	import { PauseIcon, PlayIcon } from "phosphor-svelte";
	import { onDestroy, untrack } from "svelte";

	import { t } from "$lib/i18n";
	import { formatVoiceDuration } from "$lib/model/messaging/voice-message";
	import { VoicePlayback } from "$lib/voice/playback.svelte";
	import type { AudioMessage } from "$lib/model/messaging/messages";
	import MessageBubble from "./MessageBubble.svelte";

	let { message }: { message: AudioMessage["body"] } = $props();

	// One player per bubble; the message's media never changes under it.
	const playback = untrack(
		() => new VoicePlayback({ url: message.url, lengthMs: message.length }),
	);

	onDestroy(() => playback.destroy());

	const shownMs = $derived(
		playback.playing || playback.positionMs > 0
			? playback.positionMs
			: playback.durationMs,
	);
</script>

<MessageBubble tone="sent">
	<div
		class="flex w-56 max-w-full items-center gap-2"
		data-slot="voice-message"
	>
		<button
			type="button"
			class="grid size-9 shrink-0 place-items-center rounded-full bg-black/20 text-current transition-opacity disabled:opacity-40"
			aria-label={playback.playing ? t("voice.pause") : t("voice.play")}
			disabled={!playback.playable}
			onclick={() => void playback.toggle()}
		>
			{#if playback.playing}
				<PauseIcon weight="fill" class="size-5" />
			{:else}
				<PlayIcon weight="fill" class="size-5" />
			{/if}
		</button>
		<input
			type="range"
			min="0"
			max={Math.max(1, playback.durationMs)}
			step="100"
			value={playback.positionMs}
			disabled={!playback.playable}
			aria-label={t("voice.seek")}
			class="h-1 min-w-0 flex-1 accent-current disabled:opacity-40"
			onpointerdown={(event) => event.stopPropagation()}
			oninput={(event) =>
				playback.seek(Number(event.currentTarget.value))}
		/>
		<span class="w-10 shrink-0 text-end text-xs tabular-nums opacity-80">
			{formatVoiceDuration(shownMs)}
		</span>
	</div>
	{#if playback.failed}
		<span class="mt-1 block text-xs opacity-80">
			{t("voice.playFailed")}
		</span>
	{/if}
</MessageBubble>
