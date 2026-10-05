<script lang="ts">
	import { PauseIcon, PlayIcon } from "phosphor-svelte";
	import { onDestroy, onMount, untrack } from "svelte";

	import { t } from "$lib/i18n";
	import { formatVoiceDuration } from "$lib/model/messaging/voice-message";
	import { VoicePlayback } from "$lib/voice/playback.svelte";
	import {
		loadPeaks,
		MIN_BAR_HEIGHT,
		seekFraction,
	} from "$lib/voice/waveform";
	import type { AudioMessage } from "$lib/model/messaging/messages";
	import MessageBubble from "./MessageBubble.svelte";

	let { message }: { message: AudioMessage["body"] } = $props();

	// One player per bubble; the message's media never changes under it.
	const playback = untrack(
		() => new VoicePlayback({ url: message.url, lengthMs: message.length }),
	);

	onDestroy(() => playback.destroy());

	// Onda de la nota; si no se puede calcular, queda la barra de progreso.
	let peaks = $state<number[] | null>(null);
	onMount(() => {
		const url = playback.audioUrl;
		if (url === null) return;
		void loadPeaks(url).then((result) => (peaks = result));
	});
	const progress = $derived(
		playback.durationMs > 0 ? playback.positionMs / playback.durationMs : 0,
	);

	function seekFromWave(event: PointerEvent) {
		event.stopPropagation();
		const box = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();
		const fraction = seekFraction({
			clientX: event.clientX,
			left: box.left,
			width: box.width,
		});
		playback.seek(fraction * playback.durationMs);
	}

	const shownMs = $derived(
		playback.playing || playback.positionMs > 0
			? playback.positionMs
			: playback.durationMs,
	);
</script>

<MessageBubble tone="sent">
	<div
		class="flex w-64 max-w-full items-center gap-2"
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
		{#if peaks !== null && peaks.length > 0}
			<div
				data-slot="voice-waveform"
				role="slider"
				tabindex={playback.playable ? 0 : -1}
				aria-label={t("voice.seek")}
				aria-valuemin={0}
				aria-valuemax={Math.round(playback.durationMs)}
				aria-valuenow={Math.round(playback.positionMs)}
				class="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-px"
				onpointerdown={seekFromWave}
			>
				{#each peaks as peak, index (index)}
					<span
						class={[
							"w-full min-w-px rounded-full bg-current",
							{ "opacity-35": index / peaks.length >= progress },
						]}
						style:height="{Math.max(MIN_BAR_HEIGHT, peak) * 100}%"
					></span>
				{/each}
			</div>
		{:else}
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
		{/if}
		<button
			type="button"
			data-slot="voice-speed"
			class="w-9 shrink-0 rounded-full bg-black/20 py-0.5 text-center text-xs tabular-nums"
			aria-label={t("voice.speed", { rate: playback.rate })}
			disabled={!playback.playable}
			onclick={() => playback.cycleRate()}
		>
			{playback.rate}x
		</button>
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
