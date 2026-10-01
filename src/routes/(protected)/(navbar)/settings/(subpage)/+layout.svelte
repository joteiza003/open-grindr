<script lang="ts">
	import SubpageScreen from "$lib/components/shared/SubpageScreen.svelte";
	import { t } from "$lib/i18n";

	const base = "/(protected)/(navbar)/settings/(subpage)";
	const routes = {
		[`${base}/account`]: { title: "Account Settings", back: "/settings" },
		[`${base}/account/privacy`]: {
			title: "Privacy",
			back: "/settings/account",
		},
		[`${base}/account/blocked`]: {
			title: "Blocked Users",
			back: "/settings/account",
		},
		[`${base}/account/hidden`]: {
			title: "Hidden Users",
			back: "/settings/account",
		},
		[`${base}/albums`]: {
			title: "My Albums",
			back: "/settings",
			wide: true,
		},
		[`${base}/albums/new`]: {
			title: "New Album",
			back: "/settings/albums",
		},
		[`${base}/albums/[albumId]`]: {
			title: "Edit Album",
			back: "/settings/albums",
		},
		[`${base}/app`]: { title: "App Settings", back: "/settings" },
		[`${base}/app/icon`]: {
			title: () => t("icon.title"),
			back: "/settings/app",
		},
		[`${base}/app/notifications`]: {
			title: "Notifications",
			back: "/settings/app",
		},
		[`${base}/app/credits`]: {
			title: "Credits & Licenses",
			back: "/settings/app",
		},
		[`${base}/profile`]: { title: "Edit Profile", back: "/settings" },
		[`${base}/lists`]: { title: () => t("lists.title"), back: "/settings" },
		[`${base}/silences`]: {
			title: () => t("silence.title"),
			back: "/settings",
		},
		[`${base}/navigation`]: {
			title: () => t("navSettings.title"),
			back: "/settings",
		},
		[`${base}/stats`]: { title: () => t("stats.title"), back: "/settings" },
		[`${base}/phrases`]: {
			title: () => t("phrases.settings"),
			back: "/settings",
		},
		[`${base}/translation/languages`]: {
			title: () => t("translate.languages"),
			back: "/settings/translation",
		},
		[`${base}/translation`]: {
			title: () => t("translate.title"),
			back: "/settings",
		},
	};

	let { children }: import("./$types").LayoutProps = $props();
</script>

<SubpageScreen {routes} parent="/settings">
	{@render children?.()}
</SubpageScreen>
