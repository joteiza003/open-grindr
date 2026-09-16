<script lang="ts">
	import { CaretLeftIcon } from "phosphor-svelte";

	import AlbumLibrary from "$lib/components/chat/AlbumLibrary.svelte";
</script>

<main
	class="relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<header class="flex items-center gap-2 px-4 pt-3 pb-2">
		<a
			href="/settings"
			class="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors can-hover:hover:bg-muted"
			aria-label="Back"
		>
			<CaretLeftIcon class="size-5" />
		</a>
		<h1 class="text-xl font-semibold tracking-tight">Saved albums</h1>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
		<AlbumLibrary />
	</div>
</main>
