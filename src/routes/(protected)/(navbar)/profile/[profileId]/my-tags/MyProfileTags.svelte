<script lang="ts">
	import { PlusIcon, XIcon } from "phosphor-svelte";

	import {
		addProfileTag,
		allProfileTags,
		profileMetadata,
		profileTagLimits,
		removeProfileTag,
	} from "$lib/app-data/profile-metadata.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import ProfileSection from "../ProfileSection.svelte";

	let { profileId }: { profileId: number } = $props();

	const tags = $derived(profileMetadata(profileId).tags);
	const atLimit = $derived(tags.length >= profileTagLimits.maxTags);

	// Previously-used tags on other profiles, offered as one-tap suggestions.
	const suggestions = $derived(
		allProfileTags().filter(
			(tag) => !tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
		),
	);

	let draft = $state("");

	async function add(tag: string): Promise<void> {
		const value = tag.trim();
		if (value === "" || atLimit) return;
		draft = "";
		await addProfileTag(profileId, value);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			void add(draft);
		}
	}
</script>

<ProfileSection title="My Tags">
	{#if tags.length > 0}
		<div class="flex flex-wrap items-center gap-1">
			{#each tags as tag (tag)}
				<Badge variant="secondary" class="pr-1 font-normal">
					{tag}
					<button
						type="button"
						class="ml-0.5 grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
						aria-label="Remove tag {tag}"
						onclick={() => void removeProfileTag(profileId, tag)}
					>
						<XIcon class="size-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	{#if !atLimit}
		<div class="flex items-center gap-2">
			<Input
				bind:value={draft}
				onkeydown={onKeydown}
				maxlength={profileTagLimits.maxTagLength}
				placeholder="Add a private tag…"
				aria-label="Add a private tag"
				class="h-9 flex-1"
			/>
			<Button
				type="button"
				size="icon"
				variant="secondary"
				class="size-9 shrink-0"
				disabled={draft.trim() === ""}
				aria-label="Add tag"
				onclick={() => void add(draft)}
			>
				<PlusIcon class="size-4" />
			</Button>
		</div>
	{/if}

	{#if suggestions.length > 0}
		<div class="flex flex-wrap items-center gap-1">
			{#each suggestions as tag (tag)}
				<Badge
					variant="outline"
					class="cursor-pointer font-normal text-muted-foreground can-hover:hover:bg-muted"
					role="button"
					tabindex={0}
					aria-label="Add tag {tag}"
					onclick={() => void add(tag)}
					onkeydown={(event: KeyboardEvent) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							void add(tag);
						}
					}}
				>
					<PlusIcon class="size-3" />
					{tag}
				</Badge>
			{/each}
		</div>
	{/if}
</ProfileSection>
