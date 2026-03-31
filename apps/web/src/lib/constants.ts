// ============================================================================
// App-wide constants — configurable via .env or update here
// ============================================================================

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PTE Master";
export const APP_TAGLINE = "AI-Powered PTE Practice Platform";

// Store links — set in .env when apps are published
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "";
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "";

// Social links — set in .env with real accounts
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";
export const YOUTUBE_URL = process.env.NEXT_PUBLIC_YOUTUBE_URL || "";
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "";

// Contact — set in .env
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";

// Feature flags
export const IS_BETA = true; // Set to false after beta period
export const PLAY_STORE_LIVE = !!PLAY_STORE_URL;
export const APP_STORE_LIVE = !!APP_STORE_URL;
