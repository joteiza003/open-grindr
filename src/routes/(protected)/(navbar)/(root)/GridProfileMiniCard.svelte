<script lang="ts">
	import ProfileMiniCard from "$lib/components/profile/ProfileMiniCard.svelte";

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
		nameStyle?: "solid" | "gradient" | "none";
	} = $props();
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
	{nameStyle}
	href="/profile/{id}"
/>
