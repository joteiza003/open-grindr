<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";
	import { leaveMap } from "$lib/map/leave-map";

	let { error, reset }: { error: unknown; reset: () => void } = $props();

	const detail = $derived(
		error instanceof Error ? error.message : String(error),
	);
</script>

<main
	class="pointer-events-auto flex h-dvh w-full flex-col items-center justify-center gap-4 px-6 pt-(--safe-area-top) pb-(--safe-area-bottom) text-center"
>
	<h1 class="text-lg font-semibold">{t("map.errorTitle")}</h1>
	<p class="max-w-sm text-sm break-words text-muted-foreground">{detail}</p>
	<div class="flex gap-2">
		<Button variant="secondary" onclick={leaveMap}
			>{t("common.back")}</Button
		>
		<Button onclick={reset}>{t("map.retry")}</Button>
	</div>
</main>
