//! Bridge to the Android ML Kit translation plugin (`TranslatePlugin.kt`).
//!
//! Everything is a thin pass-through: the Kotlin side owns the models and the
//! translation itself. On other platforms the commands report "unavailable" so
//! the web layer falls back to its online providers.

use serde::{Deserialize, Serialize};
#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;
use tauri::plugin::{Builder, TauriPlugin};
#[cfg(target_os = "android")]
use tauri::Manager;
use tauri::{AppHandle, Wry};

use crate::error::AppError;

#[cfg(target_os = "android")]
struct AndroidTranslate {
	handle: PluginHandle<Wry>,
}

pub fn plugin() -> TauriPlugin<Wry> {
	Builder::new("translate")
		.setup(|_app, _api| {
			#[cfg(target_os = "android")]
			{
				let handle = _api.register_android_plugin(
					"org.opengrind.translate",
					"TranslatePlugin",
				)?;
				_app.manage(AndroidTranslate { handle });
			}
			Ok(())
		})
		.build()
}

#[derive(Debug, Deserialize, Serialize)]
pub struct IdentifyResult {
	pub language: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TranslateResult {
	pub text: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ModelList {
	pub downloaded: Vec<String>,
	pub supported: Vec<String>,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct IdentifyArgs {
	text: String,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct TranslateArgs {
	text: String,
	source: String,
	target: String,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelArgs {
	language: String,
	wifi_only: bool,
}

#[cfg(target_os = "android")]
fn translate_error(error: impl std::fmt::Display) -> AppError {
	// The Kotlin side rejects with short stable codes; keep them verbatim so
	// the web layer can match on them.
	AppError::Media(error.to_string())
}

#[cfg(not(target_os = "android"))]
fn unavailable() -> AppError {
	AppError::Media("translate-unavailable".into())
}

#[tauri::command]
pub async fn translate_available() -> bool {
	cfg!(target_os = "android")
}

#[tauri::command]
pub async fn translate_identify(
	_app: AppHandle,
	text: String,
) -> Result<IdentifyResult, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidTranslate>().handle.clone();
		handle
			.run_mobile_plugin_async::<IdentifyResult>(
				"identifyLanguage",
				IdentifyArgs { text },
			)
			.await
			.map_err(translate_error)
	}
	#[cfg(not(target_os = "android"))]
	{
		let _ = text;
		Err(unavailable())
	}
}

#[tauri::command]
pub async fn translate_text(
	_app: AppHandle,
	text: String,
	source: String,
	target: String,
) -> Result<TranslateResult, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidTranslate>().handle.clone();
		handle
			.run_mobile_plugin_async::<TranslateResult>(
				"translate",
				TranslateArgs {
					text,
					source,
					target,
				},
			)
			.await
			.map_err(translate_error)
	}
	#[cfg(not(target_os = "android"))]
	{
		let _ = (text, source, target);
		Err(unavailable())
	}
}

#[tauri::command]
pub async fn translate_models(_app: AppHandle) -> Result<ModelList, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidTranslate>().handle.clone();
		handle
			.run_mobile_plugin_async::<ModelList>("listModels", ())
			.await
			.map_err(translate_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn translate_download(
	_app: AppHandle,
	language: String,
	wifi_only: bool,
) -> Result<(), AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidTranslate>().handle.clone();
		handle
			.run_mobile_plugin_async::<serde_json::Value>(
				"downloadModel",
				ModelArgs {
					language,
					wifi_only,
				},
			)
			.await
			.map(|_| ())
			.map_err(translate_error)
	}
	#[cfg(not(target_os = "android"))]
	{
		let _ = (language, wifi_only);
		Err(unavailable())
	}
}

#[tauri::command]
pub async fn translate_delete(
	_app: AppHandle,
	language: String,
) -> Result<(), AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidTranslate>().handle.clone();
		handle
			.run_mobile_plugin_async::<serde_json::Value>(
				"deleteModel",
				ModelArgs {
					language,
					wifi_only: false,
				},
			)
			.await
			.map(|_| ())
			.map_err(translate_error)
	}
	#[cfg(not(target_os = "android"))]
	{
		let _ = language;
		Err(unavailable())
	}
}
