use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::slice;

use crate::chain::{AdapterKind, Discipline, ProcessChain, ProcessEvent, ProcessMetrics};
use crate::identity::CreatorKey;
use crate::seal::{build_dossier, render_dossier_html, verify_seal, WroughtmarkSeal};
use crate::{blake3_hex, sha256_hex};

/// Compute lowercase hex SHA-256 of a byte buffer. Caller must free with `wm_free_string`.
#[no_mangle]
pub unsafe extern "C" fn wm_sha256_hex(data: *const u8, len: usize) -> *mut c_char {
    if data.is_null() {
        return std::ptr::null_mut();
    }
    let bytes = slice::from_raw_parts(data, len);
    let hex_str = sha256_hex(bytes);
    CString::new(hex_str)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

/// Compute lowercase hex BLAKE3 of a byte buffer. Caller must free with `wm_free_string`.
#[no_mangle]
pub unsafe extern "C" fn wm_blake3_hex(data: *const u8, len: usize) -> *mut c_char {
    if data.is_null() {
        return std::ptr::null_mut();
    }
    let bytes = slice::from_raw_parts(data, len);
    let hex_str = blake3_hex(bytes);
    CString::new(hex_str)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

/// Mint a signed `WroughtmarkSeal` JSON string for a mobile/wearable physical co-sign capture.
/// Caller must free with `wm_free_string`. Returns NULL on error.
#[no_mangle]
pub unsafe extern "C" fn wm_mint_physical_seal_json(
    capture_ptr: *const u8,
    capture_len: usize,
    project_id_ptr: *const c_char,
    discipline_ptr: *const c_char,
    device_label_ptr: *const c_char,
    timestamp_utc_ptr: *const c_char,
) -> *mut c_char {
    if capture_ptr.is_null()
        || project_id_ptr.is_null()
        || discipline_ptr.is_null()
        || device_label_ptr.is_null()
        || timestamp_utc_ptr.is_null()
    {
        return std::ptr::null_mut();
    }
    let capture_bytes = slice::from_raw_parts(capture_ptr, capture_len);
    let Ok(project_id) = CStr::from_ptr(project_id_ptr).to_str() else {
        return std::ptr::null_mut();
    };
    let Ok(disc_str) = CStr::from_ptr(discipline_ptr).to_str() else {
        return std::ptr::null_mut();
    };
    let Ok(device_label) = CStr::from_ptr(device_label_ptr).to_str() else {
        return std::ptr::null_mut();
    };
    let Ok(timestamp_utc) = CStr::from_ptr(timestamp_utc_ptr).to_str() else {
        return std::ptr::null_mut();
    };

    let discipline = match disc_str.to_ascii_lowercase().as_str() {
        "writing" => Discipline::Writing,
        "music" => Discipline::Music,
        "visual" => Discipline::Visual,
        "film" => Discipline::Film,
        "code" => Discipline::Code,
        "science" => Discipline::Science,
        "review" => Discipline::Review,
        _ => Discipline::Film,
    };

    let mut seed = [0u8; 32];
    let seed_digest = blake3::hash(format!("{project_id}:{device_label}:{timestamp_utc}").as_bytes());
    seed.copy_from_slice(seed_digest.as_bytes());
    let key = CreatorKey::from_seed(seed);

    let mut chain = ProcessChain::new(project_id);
    if chain
        .record_event(
            &key,
            timestamp_utc,
            AdapterKind::Physical,
            ProcessMetrics {
                active_seconds: 180,
                delta_bytes: 256,
                entropy_score: 0.9,
                structural_units: 1,
            },
            b"studio_companion_session_pair",
        )
        .is_err()
    {
        return std::ptr::null_mut();
    }
    if chain
        .record_event(
            &key,
            timestamp_utc,
            AdapterKind::Physical,
            ProcessMetrics {
                active_seconds: 180,
                delta_bytes: capture_bytes.len().max(1) as u64,
                entropy_score: 0.95,
                structural_units: 1,
            },
            capture_bytes,
        )
        .is_err()
    {
        return std::ptr::null_mut();
    }

    let Ok(seal) = WroughtmarkSeal::mint(
        &key,
        &chain,
        discipline,
        capture_bytes,
        vec![device_label.to_string()],
    ) else {
        return std::ptr::null_mut();
    };
    let Ok(json) = serde_json::to_string_pretty(&seal) else {
        return std::ptr::null_mut();
    };
    CString::new(json)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

/// Verify a `WroughtmarkSeal` JSON string against raw output bytes (and optional events JSON).
/// Returns `0` on valid seal, non-zero error code otherwise.
#[no_mangle]
pub unsafe extern "C" fn wm_verify_seal_json(
    output_ptr: *const u8,
    output_len: usize,
    seal_json_ptr: *const c_char,
    events_json_ptr: *const c_char,
) -> i32 {
    if output_ptr.is_null() || seal_json_ptr.is_null() {
        return -1;
    }
    let output_bytes = slice::from_raw_parts(output_ptr, output_len);
    let Ok(seal_str) = CStr::from_ptr(seal_json_ptr).to_str() else {
        return -2;
    };
    let Ok(seal) = serde_json::from_str::<WroughtmarkSeal>(seal_str) else {
        return -3;
    };

    let parsed_events: Option<Vec<ProcessEvent>> = if events_json_ptr.is_null() {
        None
    } else {
        let Ok(ev_str) = CStr::from_ptr(events_json_ptr).to_str() else {
            return -4;
        };
        let Ok(events) = serde_json::from_str::<Vec<ProcessEvent>>(ev_str) else {
            return -5;
        };
        Some(events)
    };

    match verify_seal(output_bytes, &seal, parsed_events.as_deref()) {
        Ok(()) => 0,
        Err(_) => 1,
    }
}

/// Verify a `WroughtmarkSeal` and return a printable HTML dossier string.
/// Caller must free the returned pointer with `wm_free_string`. Returns NULL on failure.
#[no_mangle]
pub unsafe extern "C" fn wm_build_dossier_html(
    output_ptr: *const u8,
    output_len: usize,
    seal_json_ptr: *const c_char,
    events_json_ptr: *const c_char,
) -> *mut c_char {
    if output_ptr.is_null() || seal_json_ptr.is_null() {
        return std::ptr::null_mut();
    }
    let output_bytes = slice::from_raw_parts(output_ptr, output_len);
    let Ok(seal_str) = CStr::from_ptr(seal_json_ptr).to_str() else {
        return std::ptr::null_mut();
    };
    let Ok(seal) = serde_json::from_str::<WroughtmarkSeal>(seal_str) else {
        return std::ptr::null_mut();
    };
    let parsed_events: Option<Vec<ProcessEvent>> = if events_json_ptr.is_null() {
        None
    } else {
        let Ok(ev_str) = CStr::from_ptr(events_json_ptr).to_str() else {
            return std::ptr::null_mut();
        };
        let Ok(events) = serde_json::from_str::<Vec<ProcessEvent>>(ev_str) else {
            return std::ptr::null_mut();
        };
        Some(events)
    };
    let Ok(report) = build_dossier(output_bytes, &seal, parsed_events.as_deref()) else {
        return std::ptr::null_mut();
    };
    let html = render_dossier_html(&report);
    CString::new(html)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

/// Free a C string allocated by `wroughtmark-core`.
#[no_mangle]
pub unsafe extern "C" fn wm_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(CString::from_raw(ptr));
    }
}
