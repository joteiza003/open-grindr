<script lang="ts">
	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Card from "$lib/components/ui/card";
	import { typing } from "$lib/chat/typing-state.svelte";
	import { t } from "$lib/i18n";
	import type { ConversationProfile } from "../conversation-state.svelte";

	let {
		profile,
		conversationId,
	}: { profile: ConversationProfile; conversationId: string } = $props();

	const isTyping = $derived(typing.isTyping(conversationId));
</script>

<a href="/profile/{profile.profileId}" class="flex-1 py-4 ps-0 pe-4">
	<Card.Header class="flex items-center gap-4 px-0">
		<Avatar.Root class="size-avatar after:rounded-full">
			<UserAvatar
				mediaHash={profile.mediaHash ?? null}
				class="size-full *:rounded-full"
				size="lg"
			/>
		</Avatar.Root>
		<div class="flex min-w-0 flex-col">
			<Card.Title
				class={[
					"flex min-w-0 items-center gap-1",
					{ "text-muted-foreground": !profile.name },
				]}
			>
				<ProfileStatusIndicator onlineUntil={profile.onlineUntil} />
				<DisplayName name={profile.name} class="truncate" />
			</Card.Title>
			{#if isTyping}
				<Card.Description
					data-slot="typing-indicator"
					class="truncate font-medium text-primary"
				>
					{t("chat.typing")}
				</Card.Description>
			{:else if profile.distance === null}
				<Card.Description class="truncate"
					>Distance unknown</Card.Description
				>
			{:else}
				<Card.Description class="truncate">
					<DistanceFormatted distance={profile.distance} />
				</Card.Description>
			{/if}
		</div>
	</Card.Header>
</a>
