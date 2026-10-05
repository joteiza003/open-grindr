<script lang="ts">
	import { Skeleton } from "$lib/components/ui/skeleton";

	let { ourProfile = false }: { ourProfile?: boolean } = $props();
</script>

<!-- Misma forma que el perfil real: nombre, acciones, resumen, etiquetas y tarjetas. -->
<div
	data-slot="profile-skeleton"
	class={[
		"flex max-w-full flex-col gap-4 p-4",
		{ "pb-24": ourProfile, "pb-40": !ourProfile },
	]}
>
	<div class="flex flex-col gap-2">
		<Skeleton class="h-7 w-44 max-w-full" />
		<Skeleton class="h-3.5 w-32 max-w-full" />
	</div>
	{#if !ourProfile}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each [0, 1, 2, 3] as i (i)}
				<Skeleton class="h-9 rounded-full" />
			{/each}
		</div>
	{/if}
	<div class="flex flex-wrap gap-2">
		{#each [24, 20, 28, 16] as w, i (i)}
			<Skeleton
				class="h-7 w-(--w) rounded-full"
				--w="calc(var(--spacing) * {w})"
			/>
		{/each}
	</div>
	<Skeleton class="h-24 w-full rounded-4xl" />
	<Skeleton class="h-32 w-full rounded-4xl" />
</div>
