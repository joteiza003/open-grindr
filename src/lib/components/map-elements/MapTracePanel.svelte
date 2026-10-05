<script lang="ts">
	import * as clipboard from "@tauri-apps/plugin-clipboard-manager";
	import { XIcon } from "phosphor-svelte";
	import { untrack } from "svelte";
	import { toast } from "svelte-sonner";

	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import { traceReport } from "$lib/map/map-trace";

	let {
		facts,
		onClose,
	}: {
		/** What the screen knows about itself, added to the report. */
		facts: Record<string, string | number>;
		onClose: () => void;
	} = $props();

	// Taken once, when the panel opens.
	const report = untrack(() => traceReport(facts));

	async function copy() {
		try {
			await clipboard.writeText(report);
			toast.success(t("map.traceCopied"));
		} catch (error) {
			console.error("[map] could not copy the report", error);
			toast.error(t("map.traceCopyFailed"));
		}
	}
</script>

<section
	class="pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-2 overflow-hidden rounded-3xl border border-border/80 bg-card p-3 shadow-2xl"
	aria-label={t("map.traceTitle")}
>
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold">{t("map.traceTitle")}</h2>
		<Button
			variant="ghost"
			size="icon"
			class="size-8 rounded-full text-foreground"
			aria-label={t("common.close")}
			onclick={onClose}
		>
			<XIcon class="size-4" />
		</Button>
	</div>
	<p class="text-xs text-muted-foreground">{t("map.traceHint")}</p>
	<pre
		class="max-h-44 overflow-auto rounded-xl bg-muted/60 p-2 text-[10px] leading-snug break-words whitespace-pre-wrap">{report}</pre>
	<Button variant="secondary" size="sm" onclick={() => void copy()}>
		{t("map.traceCopy")}
	</Button>
</section>
