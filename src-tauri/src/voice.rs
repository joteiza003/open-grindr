//! Bridge to the Android voice recorder (`VoicePlugin.kt`).
//!
//! Recording happens natively so the message is real AAC, which is what the
//! official apps play; the browser's recorder produces Opus/WebM instead. The
//! recording is handed back as base64 and uploaded by `upload_voice_message`.
//! On other platforms the commands report "unavailable" and the web layer hides
//! the microphone button.

use serde::{Deserialize, Serialize};
#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;
use tauri::plugin::{Builder, TauriPlugin};
#[cfg(target_os = "android")]
use tauri::Manager;
use tauri::{AppHandle, Wry};

use crate::error::AppError;

#[cfg(target_os = "android")]
struct AndroidVoice {
	handle: PluginHandle<Wry>,
}

pub fn plugin() -> TauriPlugin<Wry> {
	Builder::new("voice")
		.setup(|_app, _api| {
			#[cfg(target_os = "android")]
			{
				let handle = _api.register_android_plugin(
					"org.opengrind.voice",
					"VoicePlugin",
				)?;
				_app.manage(AndroidVoice { handle });
			}
			Ok(())
		})
		.build()
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MicrophoneState {
	pub granted: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct VoiceLevel {
	pub level: f32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceRecording {
	pub content: String,
	pub length_ms: u64,
}

#[cfg(not(target_os = "android"))]
fn unavailable() -> AppError {
	AppError::Media("voice-unavailable".into())
}

/// The plugin rejects with short stable codes (`permission-denied`,
/// `too-short`, `busy`, `failed`); keep them verbatim for the web layer.
#[cfg(target_os = "android")]
fn voice_error(error: impl std::fmt::Display) -> AppError {
	AppError::Media(error.to_string())
}

#[tauri::command]
pub async fn voice_available() -> bool {
	cfg!(target_os = "android")
}

#[tauri::command]
pub async fn voice_ensure_microphone(
	_app: AppHandle,
) -> Result<MicrophoneState, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidVoice>().handle.clone();
		handle
			.run_mobile_plugin_async::<MicrophoneState>("ensureMicrophone", ())
			.await
			.map_err(voice_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn voice_start(_app: AppHandle) -> Result<(), AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidVoice>().handle.clone();
		handle
			.run_mobile_plugin_async::<serde_json::Value>("start", ())
			.await
			.map(|_| ())
			.map_err(voice_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn voice_level(_app: AppHandle) -> Result<VoiceLevel, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidVoice>().handle.clone();
		handle
			.run_mobile_plugin_async::<VoiceLevel>("level", ())
			.await
			.map_err(voice_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn voice_stop(_app: AppHandle) -> Result<VoiceRecording, AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidVoice>().handle.clone();
		handle
			.run_mobile_plugin_async::<VoiceRecording>("stop", ())
			.await
			.map_err(voice_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}

#[tauri::command]
pub async fn voice_cancel(_app: AppHandle) -> Result<(), AppError> {
	#[cfg(target_os = "android")]
	{
		let handle = _app.state::<AndroidVoice>().handle.clone();
		handle
			.run_mobile_plugin_async::<serde_json::Value>("cancel", ())
			.await
			.map(|_| ())
			.map_err(voice_error)
	}
	#[cfg(not(target_os = "android"))]
	Err(unavailable())
}
