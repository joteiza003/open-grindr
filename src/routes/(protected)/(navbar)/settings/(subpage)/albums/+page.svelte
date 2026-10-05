<script lang="ts">
	import { untrack } from "svelte";

	import { getMyAlbumsState } from "$lib/albums/my-albums-state.svelte";
	import AlbumLimitsCounter from "$lib/components/album/AlbumLimitsCounter.svelte";
	import AlbumTile from "$lib/components/album/AlbumTile.svelte";
	import AddTile from "$lib/components/shared/AddTile.svelte";
	import MediaGrid from "$lib/components/shared/MediaGrid.svelte";

	const { data }: import("./$types").PageProps = $props();

	const myAlbums = untrack(() => getMyAlbumsState(data.ourProfileId));

	const atAlbumCap = $derived(
		myAlbums.albums !== null &&
			myAlbums.maxAlbums !== null &&
			myAlbums.albums.length >= myAlbums.maxAlbums,
	);

	void myAlbums.refresh();
</script>

<svelte:head>
	<title>My albums</title>
</svelte:head>

{#if myAlbums.albums !== null && myAlbums.maxAlbums !== null}
	<AlbumLimitsCounter
		count={myAlbums.albums.length}
		maxAlbums={myAlbums.maxAlbums}
		class="px-1 pb-2"
	/>
{/if}

<MediaGrid
	items={myAlbums.albums}
	key={(album) => album.albumId}
	empty={false}
	error={myAlbums.error}
	onRetry={() => void myAlbums.reload()}
	skeletons={8}
	gridClass="[--photo-grid-aspect:3/4]"
>
	{#snippet leading()}
		{#if !atAlbumCap}
			<AddTile
				href="/settings/albums/new"
				label="Add album"
				class="aspect-(--photo-grid-aspect)"
			/>
		{/if}
	{/snippet}
	{#snippet tile(album)}
		<AlbumTile {album} href="/settings/albums/{album.albumId}" />
	{/snippet}
</MediaGrid>
