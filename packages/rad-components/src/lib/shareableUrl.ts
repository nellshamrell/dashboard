import pako from 'pako';
import {
  ApplicationGraphResponse,
  ValidationResult,
  validateApplicationGraphResponse,
} from './graphImport';

// --- Types ---

export interface EncodeResult {
  success: boolean;
  url?: string;
  error?: string;
}

// --- Constants ---

const URL_MAX_LENGTH = 64_000;
const HASH_PREFIX = 'graph=';

// --- Helpers ---

/**
 * Converts a Uint8Array to a Base64 URL-safe string (no padding).
 * Replaces `+` → `-`, `/` → `_`, strips trailing `=`.
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a Base64 URL-safe string back to a Uint8Array.
 * Restores `+` and `/`, re-adds padding.
 */
function fromBase64Url(base64url: string): Uint8Array {
  // Restore standard Base64 characters
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Re-add padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Encode ---

/**
 * Encodes ApplicationGraphResponse JSON into a shareable URL.
 * Uses deflate compression + Base64 URL-safe encoding.
 *
 * @param response - The validated ApplicationGraphResponse
 * @param baseUrl - The dashboard's base URL (e.g., window.location.origin + '/preview')
 * @returns Encoding result with URL or error
 */
export function encodeGraphUrl(
  response: ApplicationGraphResponse,
  baseUrl: string,
): EncodeResult {
  const json = JSON.stringify(response);
  const compressed = pako.deflate(json);
  const encoded = toBase64Url(compressed);
  const url = `${baseUrl}#${HASH_PREFIX}${encoded}`;

  if (url.length > URL_MAX_LENGTH) {
    return {
      success: false,
      error:
        'Graph data is too large to share via URL. Export the JSON file instead.',
    };
  }

  return { success: true, url };
}

// --- Decode ---

/**
 * Extracts and decodes ApplicationGraphResponse from a URL hash fragment.
 *
 * @param hash - The URL hash string (e.g., "#graph=...")
 * @returns Decode result with validated data or error
 */
export function decodeGraphUrl(
  hash: string,
): ValidationResult<ApplicationGraphResponse> {
  // Strip leading '#' if present
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;

  // Find graph= parameter
  if (!fragment.startsWith(HASH_PREFIX)) {
    // Check if it appears elsewhere (e.g. after other params)
    const idx = fragment.indexOf(HASH_PREFIX);
    if (idx === -1) {
      return { success: false, errors: ['No graph data found in URL'] };
    }
    return decodeGraphData(fragment.slice(idx + HASH_PREFIX.length));
  }

  return decodeGraphData(fragment.slice(HASH_PREFIX.length));
}

function decodeGraphData(
  encoded: string,
): ValidationResult<ApplicationGraphResponse> {
  // Base64 URL-safe decode
  let compressed: Uint8Array;
  try {
    compressed = fromBase64Url(encoded);
  } catch {
    return {
      success: false,
      errors: ['Unable to decode shared link: invalid encoding'],
    };
  }

  // Decompress
  let json: string;
  try {
    json = pako.inflate(compressed, { to: 'string' });
  } catch {
    return {
      success: false,
      errors: ['Unable to decode shared link: data appears corrupted'],
    };
  }

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return {
      success: false,
      errors: ['Unable to decode shared link: invalid data format'],
    };
  }

  // Validate
  return validateApplicationGraphResponse(data);
}

// --- Clipboard ---

/**
 * Generates the shareable URL and copies it to the clipboard.
 * Updates the browser URL hash to match.
 *
 * @param response - The current ApplicationGraphResponse
 * @returns Promise resolving to the encode result
 */
export async function copyShareUrl(
  response: ApplicationGraphResponse,
): Promise<EncodeResult> {
  const baseUrl = `${window.location.origin}/preview`;
  const result = encodeGraphUrl(response, baseUrl);

  if (result.success && result.url) {
    // Update the browser URL hash
    const hashIndex = result.url.indexOf('#');
    if (hashIndex !== -1) {
      window.location.hash = result.url.slice(hashIndex + 1);
    }

    // Copy full URL to clipboard
    await navigator.clipboard.writeText(result.url);
  }

  return result;
}
