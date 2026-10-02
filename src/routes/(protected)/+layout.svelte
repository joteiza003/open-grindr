<script lang="ts">
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import CommandCenter from "$lib/components/command-center/CommandCenter.svelte";
	import ProfilePreviewSheet from "$lib/components/profile/ProfilePreviewSheet.svelte";
	import WhatsNewSheet from "$lib/components/shared/WhatsNewSheet.svelte";
	import { startOnlineHeartbeat } from "$lib/presence/online-heartbeat";
	import { startTypingTracking } from "$lib/chat/typing-state.svelte";
	import { startSilenceSweeper } from "$lib/safety/silence-state.svelte";
	import { startMessageTracking } from "$lib/stats/message-tracker";
	import { startSessionTracking } from "$lib/stats/session-tracker";

	let {
		data,
		children,
	}: { data: { ourProfileId: number }; children: import("svelte").Snippet } =
		$props();

	$effect(() => startOnlineHeartbeat());
	$effect(() => startSessionTracking());
	$effect(() => startTypingTracking({ ourProfileId: data.ourProfileId }));
	$effect(() => {
		const conversations = getOrCreateConversationsState(data.ourProfileId);
		return startSilenceSweeper({
			unmute: (conversationId) =>
				conversations.setMuted({
					conversationIds: [conversationId],
					muted: false,
				}),
		});
	});
	$effect(() => startMessageTracking({ ourProfileId: data.ourProfileId }));
</script>

{@render children()}
<CommandCenter />
<ProfilePreviewSheet />
<WhatsNewSheet />
