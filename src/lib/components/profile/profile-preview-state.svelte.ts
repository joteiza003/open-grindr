/** Datos que la pantalla de origen ya tiene: se muestran mientras carga el perfil. */
export type ProfilePreviewHint = {
	displayName?: string | null;
	age?: number | null;
	distance?: number | null;
	mediaHash?: string | null;
};

class ProfilePreviewState {
	profileId = $state<number | null>(null);
	hint = $state<ProfilePreviewHint>({});

	get open(): boolean {
		return this.profileId !== null;
	}

	show(profileId: number, hint: ProfilePreviewHint = {}): void {
		this.hint = hint;
		this.profileId = profileId;
	}

	close(): void {
		this.profileId = null;
	}
}

export const profilePreview = new ProfilePreviewState();

export function openProfilePreview(
	profileId: number,
	hint?: ProfilePreviewHint,
): void {
	profilePreview.show(profileId, hint);
}
