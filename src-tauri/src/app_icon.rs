//! Bridge to the Android launcher-icon switcher (`AppIconPlugin.kt`).
//!
//! The icon and name are swapped by enabling one of several manifest
//! `<activity-alias>` entries. Other platforms report "unavailable".

use serde::{Deserialize, Serialize};
#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;
use tauri::plugin::{Builder, TauriPlugin};
#[cfg(target_os = "android")]
use tauri::Manager;
use tauri::{AppHandle, Wry};

use crate::error::AppError;

#[cfg(target_os = "android")]
struct AndroidAppIcon {
	handle: PluginHandle<Wry>,
}

pub fn plugin() -> TauriPlugin<Wry> {
	Builder::new("app-icon")
		.setup(|_app, _api| {
			#[cfg(target_os = "android")]
			{
				let handle = _api.register_android_plugin(
					"org.opengrind.appicon",
					"AppIconPlugin",
				)?;
				_app.manage(AndroidAppIcon { handle });
			}
			Ok(())
		})
		.build()
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AppIcon {
	pub icon: String,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct SetIconArgs {
	icon: String,
}

#[cfg(target_os = "android")]
fn icon_error(error: impl std::fmt::Display) -> AppError {
	// The plugin rejects with short stable codes (`unknown-icon`, `failed`).
	AppError::Media(error.to_string())
}

#[cfg(not(target_os = "android"))]
fn unavailable() -> AppError {
	AppError::Media("app-icon-unavailable".into())
}

#[tauri::command]
pub async fn app_icon_available() -> bool {
	cfg!(target_os = "android")
}

#[tauri::command]
pub async fn app_icon_current(_app: AppHandle) -> Result<AppIcon, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidAppIcon>().handle.clone();
		handle
			.run_mobile_plugin_async::<AppIcon>("current", ())
			.await
			.map_err(icon_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn app_icon_set(
	_app: AppHandle,
	icon: String,
) -> Result<AppIcon, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidAppIcon>().handle.clone();
		handle
			.run_mobile_plugin_async::<AppIcon>("set", SetIconArgs { icon })
			.await
			.map_err(icon_error)
	}
	#[cfg(not(target_os = "android"))]
	{
		let _ = icon;
		Err(unavailable())
	}
}
