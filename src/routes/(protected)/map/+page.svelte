<script lang="ts">
	import MapCrashed from "$lib/components/map-elements/MapCrashed.svelte";
	import MapScreen from "$lib/components/map-elements/MapScreen.svelte";
</script>

<!-- If anything in the map throws while rendering, show a way out instead of a
     frozen screen. -->
<svelte:boundary
	onerror={(error) => console.error("[map] the screen crashed", error)}
>
	<MapScreen />
	{#snippet failed(error, reset)}
		<MapCrashed {error} {reset} />
	{/snippet}
</svelte:boundary>
