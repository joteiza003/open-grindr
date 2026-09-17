<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import * as Item from "$lib/components/ui/item";
	import { t } from "$lib/i18n";

	type ChatStyle = "default" | "whatsapp";

	let pending = $state<ChatStyle | null>(null);
	const current = $derived(
		pending ?? preferencesSnapshot().chat.style ?? "default",
	);

	function choose(style: ChatStyle): void {
		if (style === current) return;
		pending = style;
		const chat = { ...preferencesSnapshot().chat, style };
		setPreferences({ chat }).catch((error) => {
			pending = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>{t("appearance.chatStyle")}</Item.Title>
		<Item.Description>{t("appearance.chatStyleHint")}</Item.Description>
	</Item.Content>
	<div
		class="flex w-full flex-col gap-2"
		role="radiogroup"
		aria-label={t("appearance.chatStyle")}
	>
		<button
			type="button"
			role="radio"
			aria-checked={current === "default"}
			disabled={!preferencesLoaded()}
			class="rounded-2xl border border-border px-3 py-2 text-left text-sm aria-checked:border-foreground aria-checked:bg-muted"
			onclick={() => choose("default")}
		>
			{t("appearance.styleDefault")}
		</button>
		<button
			type="button"
			role="radio"
			aria-checked={current === "whatsapp"}
			disabled={!preferencesLoaded()}
			class="rounded-2xl border border-border px-3 py-2 text-left text-sm aria-checked:border-foreground aria-checked:bg-muted"
			onclick={() => choose("whatsapp")}
		>
			{t("appearance.styleWhatsapp")}
		</button>
	</div>
	{#if current === "whatsapp"}
		<p class="text-xs text-muted-foreground">
			{t("appearance.whatsappNote")}
		</p>
	{/if}
</Item.Root>
