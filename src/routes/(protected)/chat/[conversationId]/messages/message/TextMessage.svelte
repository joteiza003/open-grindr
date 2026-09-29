<script lang="ts">
	import { t } from "$lib/i18n";
	import { languageName } from "$lib/translate/languages";
	import { isTranslatable } from "$lib/translate/text";
	import {
		messageTranslations,
		translationErrorKey,
		translationSettings,
	} from "$lib/translate/translation-state.svelte";
	import type { TextMessage } from "$lib/model/messaging/messages";
	import { getMessageContext } from "./context";
	import MessageBubble from "./MessageBubble.svelte";

	let {
		message,
		messageId,
	}: { message: TextMessage["body"]; messageId?: string } = $props();

	const { isOut } = $derived(getMessageContext()());
	const settings = $derived(translationSettings());
	const canTranslate = $derived(
		settings.enabled &&
			!isOut &&
			messageId !== undefined &&
			isTranslatable(message.text),
	);
	const entry = $derived(
		messageId === undefined
			? undefined
			: messageTranslations.get(messageId),
	);

	// Live: translate each received message as soon as it renders.
	$effect(() => {
		if (!canTranslate || !settings.autoIncoming || messageId === undefined)
			return;
		if (messageTranslations.get(messageId) === undefined) {
			void messageTranslations.show(messageId, message.text);
		}
	});

	const shown = $derived(entry?.visible === true);
	// A message already in the reader's language has nothing to show.
	const redundant = $derived(entry?.status === "done" && entry.sameLanguage);
</script>

<MessageBubble tone="sent">
	<span class="wrap-anywhere whitespace-pre-wrap">{message.text}</span>
	{#if canTranslate && messageId !== undefined}
		{#if entry?.status === "loading"}
			<span class="mt-1 block text-xs opacity-70">
				{t("translate.translating")}
			</span>
		{:else if entry?.status === "error"}
			<span class="mt-1 block text-xs opacity-80">
				{t(translationErrorKey(entry.error))}
				<button
					type="button"
					class="ms-1 underline"
					onclick={() => {
						messageTranslations.reset(messageId);
						void messageTranslations.show(messageId, message.text);
					}}
				>
					{t("translate.retry")}
				</button>
			</span>
		{:else if entry?.status === "done" && shown && !redundant}
			<span
				class="mt-1.5 block border-t border-current/20 pt-1.5 wrap-anywhere whitespace-pre-wrap"
				data-slot="message-translation"
			>
				{entry.text}
			</span>
			<span class="mt-1 flex items-center gap-2 text-xs opacity-70">
				{#if entry.from}
					<span>
						{t("translate.from", {
							language: languageName(entry.from),
						})}
					</span>
				{/if}
				<button
					type="button"
					class="underline"
					onclick={() => messageTranslations.hide(messageId)}
				>
					{t("translate.showOriginal")}
				</button>
			</span>
		{:else if !redundant}
			<button
				type="button"
				class="mt-1 block text-xs underline opacity-70"
				onclick={() =>
					void messageTranslations.show(messageId, message.text)}
			>
				{t("translate.action")}
			</button>
		{/if}
	{/if}
</MessageBubble>
