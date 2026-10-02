<script lang="ts">
	import {
		EyeSlashIcon,
		ImageIcon,
		ImagesIcon,
		VideoCameraIcon,
	} from "phosphor-svelte";
	import type { Snippet } from "svelte";

	import { discreetModeEnabled } from "$lib/chat/discreet-mode";
	import { t } from "$lib/i18n";

	let {
		kind,
		children,
	}: { kind: "photo" | "video" | "album"; children: Snippet } = $props();

	// Cada mensaje se abre por separado y vuelve a ocultarse al salir del chat.
	let revealed = $state(false);
	const discreet = $derived(discreetModeEnabled());

	const label = $derived(t(`discreet.${kind}`));
	const Icon = $derived(
		kind === "video"
			? VideoCameraIcon
			: kind === "album"
				? ImagesIcon
				: ImageIcon,
	);
</script>

{#if discreet && !revealed}
	<button
		type="button"
		data-discreet-gate={kind}
		class="ms-3 flex items-center gap-2 rounded-lg bg-card-foreground/10 px-3 py-2.5 text-start text-sm font-medium active:opacity-80"
		onclick={() => (revealed = true)}
	>
		<Icon class="size-5 shrink-0" weight="fill" />
		<span>{label}</span>
	</button>
{:else}
	{@render children()}
	{#if discreet}
		<button
			type="button"
			class="ms-3 mt-1 flex items-center gap-1 text-xs text-muted-foreground"
			onclick={() => (revealed = false)}
		>
			<EyeSlashIcon class="size-3.5" />
			{t("discreet.hide")}
		</button>
	{/if}
{/if}
