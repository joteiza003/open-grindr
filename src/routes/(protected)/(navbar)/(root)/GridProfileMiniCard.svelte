<script lang="ts">
	import { goto } from "$app/navigation";

	import { openProfilePreview } from "$lib/components/profile/profile-preview-state.svelte";
	import ProfileMiniCard from "$lib/components/profile/ProfileMiniCard.svelte";
	import { isPlainClick } from "$lib/util/plain-click";

	let {
		id,
		displayName = null,
		age = null,
		distance = null,
		medias = null,
		unread = null,
		onlineUntil = null,
		isFavorite = false,
		isVisiting = false,
		hadRecentChat = false,
		variant = "standard",
		showName = true,
		showDistance = true,
		showAge = true,
		showOnlineStatus = true,
		showFavoriteBadge = true,
		showChatBadge = true,
		nameStyle = "solid",
	}: {
		id: number;
		displayName?: string | null;
		age?: number | null;
		distance?: number | null;
		medias?: { mediaHash: string }[] | null;
		unread?: number | null;
		onlineUntil?: number | null;
		isFavorite?: boolean;
		isVisiting?: boolean;
		hadRecentChat?: boolean;
		variant?: "standard" | "compact" | "detailed";
		showName?: boolean;
		showDistance?: boolean;
		showAge?: boolean;
		showOnlineStatus?: boolean;
		showFavoriteBadge?: boolean;
		showChatBadge?: boolean;
		nameStyle?: "solid" | "gradient" | "none";
	} = $props();

	function openInPager(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		void goto(`/profile/${id}`, { state: { profileOrigin: "browse" } });
	}

	function preview() {
		openProfilePreview(id, {
			displayName,
			age,
			distance,
			mediaHash: medias?.[0]?.mediaHash ?? null,
		});
	}
</script>

<ProfileMiniCard
	mediaHash={medias?.[0]?.mediaHash ?? null}
	{displayName}
	{age}
	{distance}
	{unread}
	{onlineUntil}
	{isFavorite}
	{isVisiting}
	{hadRecentChat}
	{variant}
	{showName}
	{showDistance}
	{showAge}
	{showOnlineStatus}
	{showFavoriteBadge}
	{showChatBadge}
	{nameStyle}
	href="/profile/{id}"
	onclick={openInPager}
	onLongPress={preview}
/>
