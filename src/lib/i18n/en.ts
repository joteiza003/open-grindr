export const en = {
	"nav.browse": "Browse",
	"nav.rightNow": "Right Now",
	"nav.interest": "Interest",
	"nav.inbox": "Inbox",
	"nav.me": "Me",

	"chat.chats": "Chats",
	"chat.albums": "Albums",
	"chat.selectConversation": "Select a conversation to start chatting",
	"chat.draft": "Draft:",
	"chat.previewUnavailable": "Preview not available",
	"chat.pin": "Pin",
	"chat.unpin": "Unpin",
	"chat.mute": "Mute",
	"chat.unmute": "Unmute",
	"chat.delete": "Delete",
	"chat.sending": "Sending...",
	"chat.failedToSend": "Failed to send",
	"chat.read": "Read",
	"chat.sent": "Sent",
	"chat.saySomething": "Say something...",
	"chat.someone": "Someone",

	"appearance.title": "Appearance",
	"appearance.accent": "Accent color",
	"appearance.accentHint":
		"Used across buttons, highlights, and the active tab.",
	"appearance.browseGrid": "Browse grid",
	"appearance.chat": "Chat",
	"appearance.language": "Language",
	"appearance.chatStyle": "Chat style",
	"appearance.chatStyleHint":
		"Restyle the inbox and the conversation to match another messenger.",
	"appearance.styleDefault": "Open Grind",
	"appearance.styleWhatsapp": "WhatsApp",
	"appearance.whatsappNote":
		"WhatsApp style sets bubble colors, list density, tails and the empty wallpaper. Your saved colors return when you switch back.",

	"language.title": "App language",
	"language.hint":
		"Castellano and Euskera cover chrome, chat and settings. Missing keys fall back to English.",
	"language.en": "English",
	"language.es": "Castellano",
	"language.eu": "Euskera",

	"settings.appearance": "Appearance",
	"settings.display": "Display",
	"settings.privacy": "Privacy",
	"settings.security": "Security",
	"settings.updates": "Updates",
	"settings.about": "About",

	"common.cancel": "Cancel",
	"common.save": "Save",
	"common.close": "Close",

	"empty.chatsTitle": "No Conversations Yet",
	"empty.chatsBody": "Browse {grid} to find people to chat with.",
	"empty.chatsFilteredTitle": "No Results",
	"empty.chatsFilteredBody": "No conversations match these filters.",
	"empty.gridTitle": "No profiles found",
	"empty.gridBody": "Try adjusting your filters or reset them to defaults.",
	"appearance.theme": "Theme",
	"appearance.themeHint":
		"Dark is the designed look. Light is a paper-warm alternative.",
	"appearance.themeDark": "Dark",
	"appearance.themeLight": "Light",
	"appearance.themeSystem": "System",
} as const;

export type MessageKey = keyof typeof en;
