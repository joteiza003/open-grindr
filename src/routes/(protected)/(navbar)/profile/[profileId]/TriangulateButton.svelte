<script lang="ts">
	import { goto } from "$app/navigation";
	import { CrosshairIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import Button from "$lib/components/ui/button/button.svelte";
	import Spinner from "$lib/components/ui/spinner/spinner.svelte";
	import {
		autoTriangulateProfile,
		type AutoTriangulateProgress,
	} from "$lib/location/auto-triangulate-profile";

	let {
		profileId,
		displayName = null,
		disabled = false,
	}: {
		profileId: number;
		displayName?: string | null;
		disabled?: boolean;
	} = $props();

	let busy = $state(false);
	let status = $state<string | null>(null);

	function progressLabel(p: AutoTriangulateProgress): string {
		switch (p.step) {
			case "starting":
				return "Preparando…";
			case "measuring":
				return `Midiendo ${p.index}/${p.total}…`;
			case "computing":
				return "Calculando…";
			case "restoring":
				return "Restaurando ubicación…";
			case "done":
				return "Listo";
			case "error":
				return p.message;
		}
	}

	async function run() {
		if (busy) return;
		busy = true;
		status = "Preparando…";
		try {
			const result = await autoTriangulateProfile({
				profileId,
				displayName,
				onProgress: (p) => {
					status = progressLabel(p);
				},
			});

			const errLabel =
				result.error < 1000
					? `±${Math.round(result.error)} m`
					: `±${(result.error / 1000).toFixed(1)} km`;

			toast.success(`Posición triangulada (${errLabel})`, {
				description: "Marcador añadido al mapa",
				action: {
					label: "Ver en mapa",
					onClick: () => {
						void goto("/map");
					},
				},
			});
			status = null;
		} catch (error) {
			console.error(error);
			status = null;
			showErrorToast({
				label: "No se pudo triangular este perfil",
				error,
			});
		} finally {
			busy = false;
		}
	}
</script>

<Button
	size="sm"
	variant="secondary"
	class="gap-1.5"
	disabled={disabled || busy}
	onclick={() => void run()}
	aria-label="Posicion del perfil"
>
	{#if busy}
		<Spinner class="size-4" />
		<span class="text-xs">{status ?? "…"}</span>
	{:else}
		<CrosshairIcon class="size-4" />
		<span class="text-xs">Posicion</span>
	{/if}
</Button>
