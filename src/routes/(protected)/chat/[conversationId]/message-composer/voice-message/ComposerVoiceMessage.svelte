<script lang="ts">
	import {
		MicrophoneIcon,
		PaperPlaneRightIcon,
		TrashIcon,
	} from "phosphor-svelte";
	import { onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import { uploadVoiceMessage } from "$lib/api/messaging/voice";
	import { Button } from "$lib/components/ui/button";
	import { Spinner } from "$lib/components/ui/spinner";
	import { t } from "$lib/i18n";
	import {
		formatVoiceDuration,
		voiceMessageDraft,
	} from "$lib/model/messaging/voice-message";
	import { MAX_VOICE_MS, VoiceRecorder } from "$lib/voice/recorder.svelte";
	import type { VoiceErrorCode } from "$lib/voice/native";
	import { getMessageComposerContext } from "../message-composer-context.svelte";
	import PrimaryComposerButton from "../PrimaryComposerButton.svelte";

	const recorder = new VoiceRecorder();

	// Onda en directo: las últimas lecturas del micrófono, una barra por lectura.
	const LIVE_BARS = 40;
	let liveLevels = $state<number[]>([]);
	$effect(() => {
		if (!recorder.recording) {
			liveLevels = [];
			return;
		}
		void recorder.elapsedMs;
		const level = recorder.level;
		untrack(() => {
			liveLevels = [...liveLevels, level].slice(-LIVE_BARS);
		});
	});
	const composer = getMessageComposerContext();
	const { disabled } = $derived(composer());

	let sending = $state(false);

	const busyRecording = $derived(
		recorder.status === "recording" ||
			recorder.status === "stopping" ||
			sending,
	);

	function explain(code: VoiceErrorCode): string {
		switch (code) {
			case "permission-denied":
				return t("voice.denied");
			case "too-short":
				return t("voice.tooShort");
			case "unavailable":
				return t("voice.unavailable");
			default:
				return t("voice.failed");
		}
	}

	async function begin() {
		const error = await recorder.start();
		if (error !== null) toast.error(explain(error));
	}

	async function finish() {
		if (sending || !recorder.recording) return;
		sending = true;
		try {
			const stopped = await recorder.stop();
			if (!stopped.ok) {
				toast.error(explain(stopped.error));
				return;
			}
			const uploaded = await uploadVoiceMessage(stopped.recording);
			await composer().sendMessages([
				voiceMessageDraft({
					...uploaded,
					lengthMs: stopped.recording.lengthMs,
				}),
			]);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("voice.sendFailed"), error });
		} finally {
			sending = false;
		}
	}

	// A message can't be longer than the limit: send it when the clock runs out.
	$effect(() => {
		if (recorder.recording && recorder.elapsedMs >= MAX_VOICE_MS) {
			void finish();
		}
	});

	onDestroy(() => void recorder.cancel());
</script>

{#if recorder.available}
	{#if busyRecording}
		<div
			class="absolute inset-0 z-10 flex items-center gap-2 rounded-composer bg-popover px-1"
			data-slot="voice-recording"
		>
			<Button
				variant="ghost"
				size="icon"
				class="size-9 shrink-0 rounded-full text-destructive"
				aria-label={t("voice.cancel")}
				disabled={sending}
				onclick={() => void recorder.cancel()}
			>
				<TrashIcon class="size-5" />
			</Button>
			<span
				class="size-2.5 shrink-0 animate-pulse rounded-full bg-destructive"
				aria-hidden="true"
			></span>
			<span
				class="w-12 shrink-0 text-sm tabular-nums"
				role="timer"
				aria-label={t("voice.recording")}
			>
				{formatVoiceDuration(recorder.elapsedMs)}
			</span>
			<div
				class="flex h-8 min-w-0 flex-1 items-center justify-end gap-px"
				data-slot="voice-live-waveform"
				aria-hidden="true"
			>
				{#each liveLevels as level, index (index)}
					<span
						class="w-0.5 shrink-0 rounded-full bg-primary"
						style:height="{Math.max(8, level * 100)}%"
					></span>
				{/each}
			</div>
			<Button
				size="icon"
				class="size-9 shrink-0 rounded-full"
				aria-label={t("voice.send")}
				disabled={sending}
				onclick={() => void finish()}
			>
				{#if sending}
					<Spinner class="size-4" />
				{:else}
					<PaperPlaneRightIcon weight="fill" class="size-5" />
				{/if}
			</Button>
		</div>
	{:else}
		<PrimaryComposerButton
			aria-label={t("voice.record")}
			onclick={() => void begin()}
			class="ps-0"
			disabled={disabled || recorder.status === "starting"}
		>
			{#snippet icon({ ...props })}
				<MicrophoneIcon weight="fill" {...props} />
			{/snippet}
		</PrimaryComposerButton>
	{/if}
{/if}
