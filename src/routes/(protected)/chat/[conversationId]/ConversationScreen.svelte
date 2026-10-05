<script lang="ts">
	import { untrack } from "svelte";

	import ChatBackground from "$lib/appearance/ChatBackground.svelte";
	import { getConversations } from "$lib/chat/conversations-context.svelte";
	import { clearMarkedUnread } from "$lib/chat/marked-unread.svelte";
	import * as Card from "$lib/components/ui/card";
	import { setScreenLeaving } from "$lib/platform/back-gesture-event.svelte";
	import type { MessageDraft } from "$lib/model/messaging/messages";
	import ChatNavBar from "./conversation-nav-bar/ConversationNavBar.svelte";
	import {
		ConversationState,
		setConversationState,
	} from "./conversation-state.svelte";
	import MessageComposer from "./message-composer/MessageComposer.svelte";
	import ConversationMessages from "./messages/ConversationMessages.svelte";

	let {
		conversationId,
		ourProfileId,
		leaving = false,
	}: {
		conversationId: string;
		ourProfileId: number;
		leaving?: boolean;
	} = $props();

	setScreenLeaving(() => leaving);

	const conversations = getConversations();

	let conversationState = $state(
		untrack(
			() =>
				new ConversationState({
					conversationId,
					ourProfileId,
					conversations,
				}),
		),
	);

	// Abrir el chat quita la marca de "no leído" puesta a mano.
	$effect(() => {
		if (!leaving) void clearMarkedUnread(conversationId);
	});

	$effect(() => {
		const id = conversationId;
		const profileId = ourProfileId;
		if (leaving) return;

		const state = untrack(() => {
			if (
				id !== conversationState.conversationId ||
				profileId !== conversationState.ourProfileId ||
				conversationState.destroyed
			) {
				const next = new ConversationState({
					conversationId: id,
					ourProfileId: profileId,
					conversations,
				});
				conversationState = next;
				return next;
			}
			return conversationState;
		});

		return () => state.destroy();
	});

	setConversationState(() => conversationState);

	let composerHeight = $state(0);
</script>

<ChatNavBar />
<Card.Content class="relative flex min-h-0 flex-1 flex-col overflow-hidden p-0">
	<ChatBackground />
	<div class="relative z-10 flex min-h-0 flex-1 flex-col">
		<ConversationMessages {composerHeight} />
		<MessageComposer
			conversationId={conversationState.conversationId}
			onSend={(drafts: MessageDraft[]) => conversationState.send(drafts)}
			disabled={conversationState.loading ||
				conversationState.error !== null}
			replyTo={conversationState.replyTo}
			onCancelReply={() => conversationState.clearReplyTo()}
			bind:height={composerHeight}
		/>
	</div>
</Card.Content>
