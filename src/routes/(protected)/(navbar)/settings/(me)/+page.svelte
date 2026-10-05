<script lang="ts">
	import { version } from "$app/environment";

	import AccountSettingsLink from "./AccountSettingsLink.svelte";
	import AlbumsLink from "./AlbumsLink.svelte";
	import AppearanceSettingsLink from "./AppearanceSettingsLink.svelte";
	import AppSettingsLink from "./AppSettingsLink.svelte";
	import GreetingLink from "./GreetingLink.svelte";
	import ListsLink from "./ListsLink.svelte";
	import MapLink from "./MapLink.svelte";
	import NavigationLink from "./NavigationLink.svelte";
	import PhrasesLink from "./PhrasesLink.svelte";
	import ProfileLink from "./ProfileLink.svelte";
	import QuickSettings from "./QuickSettings.svelte";
	import SavedAlbumsLink from "./SavedAlbumsLink.svelte";
	import SignOutButton from "./SignOutButton.svelte";
	import SilencesLink from "./SilencesLink.svelte";
	import Socials from "./Socials.svelte";
	import StatsLink from "./StatsLink.svelte";
	import TranslationLink from "./TranslationLink.svelte";
	import WhatsNewLink from "./WhatsNewLink.svelte";

	const { data }: import("./$types").PageProps = $props();
</script>

<main class="screen-nav-host">
	<div
		data-slot="me-scroller"
		class="h-full w-full overflow-y-auto overscroll-none"
	>
		<div class="flex w-full p-4 pb-nav-clear">
			<div class="m-auto flex w-full max-w-120 flex-col gap-3">
				<ProfileLink id={data.ourProfileId} />
				<AlbumsLink ourProfileId={data.ourProfileId} />
				<QuickSettings />
				<span role="separator"></span>
				<div class="og-settings-group">
					<AccountSettingsLink />
					<AppearanceSettingsLink />
					<MapLink />
					<SavedAlbumsLink />
					<NavigationLink />
					<ListsLink />
					<SilencesLink />
					<WhatsNewLink />
					<PhrasesLink />
					<GreetingLink />
					<StatsLink />
					<TranslationLink />
					<AppSettingsLink />
				</div>
				<SignOutButton />
				<Socials />
				<span
					class="px-4 py-2 font-mono text-xs break-all whitespace-pre-wrap text-muted-foreground select-text"
				>
					{version}
				</span>
			</div>
		</div>
	</div>
</main>
