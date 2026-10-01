<script lang="ts">
	import CommandCenter from "$lib/components/command-center/CommandCenter.svelte";
	import ProfilePreviewSheet from "$lib/components/profile/ProfilePreviewSheet.svelte";
	import { startOnlineHeartbeat } from "$lib/presence/online-heartbeat";
	import { startMessageTracking } from "$lib/stats/message-tracker";
	import { startSessionTracking } from "$lib/stats/session-tracker";

	let {
		data,
		children,
	}: { data: { ourProfileId: number }; children: import("svelte").Snippet } =
		$props();

	$effect(() => startOnlineHeartbeat());
	$effect(() => startSessionTracking());
	$effect(() => startMessageTracking({ ourProfileId: data.ourProfileId }));
</script>

{@render children()}
<CommandCenter />
<ProfilePreviewSheet />
