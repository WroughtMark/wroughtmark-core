#ifndef WROUGHTMARK_H
#define WROUGHTMARK_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Compute lowercase hex SHA-256 of `data[0..len]`.
 * Caller must free the returned pointer with `wm_free_string`.
 */
char *wm_sha256_hex(const uint8_t *data, size_t len);

/**
 * Compute lowercase hex BLAKE3 of `data[0..len]`.
 * Caller must free the returned pointer with `wm_free_string`.
 */
char *wm_blake3_hex(const uint8_t *data, size_t len);

/**
 * Mint a signed WroughtmarkSeal JSON string for a mobile/wearable physical studio co-sign event.
 * Caller must free the returned pointer with `wm_free_string`. Returns NULL on error.
 */
char *wm_mint_physical_seal_json(
    const uint8_t *capture_bytes,
    size_t capture_len,
    const char *project_id,
    const char *discipline_str,
    const char *device_label,
    const char *timestamp_utc
);

/**
 * Verify a WroughtmarkSeal JSON string against raw deliverable bytes.
 * Pass NULL for `events_json` to verify only the deliverable digest and seal signature.
 * Returns 0 on valid seal, non-zero otherwise.
 */
int32_t wm_verify_seal_json(
    const uint8_t *output_bytes,
    size_t output_len,
    const char *seal_json,
    const char *events_json
);

/**
 * Verify a WroughtmarkSeal and render a printable HTML verification dossier.
 * Caller must free the returned pointer with `wm_free_string`. Returns NULL on failure.
 */
char *wm_build_dossier_html(
    const uint8_t *output_bytes,
    size_t output_len,
    const char *seal_json,
    const char *events_json
);

/**
 * Free a string returned by wroughtmark-core.
 */
void wm_free_string(char *ptr);

#ifdef __cplusplus
}
#endif

#endif /* WROUGHTMARK_H */
