import { measureImage, measureVideo } from "$lib/util/media-dimensions";
import {
	applyPhotoSwipeBackGesture,
	applyPhotoSwipeErrorUi,
	applyPhotoSwipeVideo,
	applyPhotoSwipeViewportSync,
} from "$lib/util/photoswipe";
import type { SavedAlbum } from "$lib/model/messaging/saved-albums";
import { savedMediaUrl } from "./saved-album-library";

type LocalSlide = {
	src: string;
	width: number;
	height: number;
	contentType: string;
	poster: string | null;
};

const FALLBACK: { width: number; height: number } = {
	width: 1080,
	height: 1080,
};

/**
 * Open a locally saved album in PhotoSwipe. Loads each stored media file as an
 * object URL, measures it, opens the lightbox, and revokes every URL when the
 * viewer closes. Reuses the same PhotoSwipe helpers as the in-chat album viewer.
 */
export async function openSavedAlbum(album: SavedAlbum): Promise<void> {
	const urls: string[] = [];
	const slides: LocalSlide[] = [];

	for (const item of album.items) {
		const url = await savedMediaUrl(item.localPath, item.contentType);
		if (url === null) continue;
		urls.push(url);
		const isVideo = item.contentType.startsWith("video/");
		const dimensions = await (
			isVideo ? measureVideo(url) : measureImage(url)
		).catch(() => FALLBACK);

		let poster: string | null = null;
		if (isVideo && item.thumbnailPath !== null) {
			poster = await savedMediaUrl(item.thumbnailPath, "image/jpeg");
			if (poster !== null) urls.push(poster);
		}

		slides.push({
			src: url,
			width: dimensions.width,
			height: dimensions.height,
			contentType: item.contentType,
			poster,
		});
	}

	if (slides.length === 0) {
		for (const url of urls) URL.revokeObjectURL(url);
		throw new Error("This album has no viewable media");
	}

	const { default: PhotoSwipeLightbox } = await import("photoswipe/lightbox");
	const lightbox = new PhotoSwipeLightbox({
		showHideAnimationType: "fade",
		pswpModule: () => import("photoswipe"),
		mainClass: "pswp--buttons-visible",
	});
	applyPhotoSwipeErrorUi(lightbox);
	applyPhotoSwipeViewportSync(lightbox);
	lightbox.addFilter("numItems", () => slides.length);
	lightbox.addFilter("itemData", (itemData, index) => {
		const slide = slides[index];
		if (slide === undefined) return itemData;
		return { src: slide.src, width: slide.width, height: slide.height };
	});
	applyPhotoSwipeBackGesture(lightbox);
	applyPhotoSwipeVideo(lightbox, (index) => {
		const slide = slides[index];
		if (!slide?.contentType.startsWith("video/")) return null;
		return { src: slide.src, poster: slide.poster ?? slide.src };
	});
	lightbox.on("closingAnimationEnd", () => {
		lightbox.destroy();
		for (const url of urls) URL.revokeObjectURL(url);
	});
	lightbox.init();
	lightbox.loadAndOpen(0);
}
