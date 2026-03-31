// ============================================================================
// Shared Utilities — Used by both Web and Mobile
// ============================================================================

/**
 * Format seconds to mm:ss display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to human readable: "2h 30m" or "45m" or "30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

/**
 * Convert PTE score (10-90) to band level
 */
export function scoreToBand(score: number): string {
  if (score >= 85) return "Expert (85-90)";
  if (score >= 76) return "Very Good (76-84)";
  if (score >= 65) return "Good (65-75)";
  if (score >= 50) return "Competent (50-64)";
  if (score >= 36) return "Modest (36-49)";
  if (score >= 25) return "Limited (25-35)";
  return "Below 25";
}

/**
 * Get color for score display
 */
export function scoreColor(score: number): string {
  if (score >= 79) return "#16a34a"; // green
  if (score >= 65) return "#2563eb"; // blue
  if (score >= 50) return "#d97706"; // amber
  return "#dc2626"; // red
}

/**
 * Calculate word count from text
 */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Slugify a string: "Divine Success Academy" → "divine-success-academy"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format price from paise to INR display: 49900 → "₹499"
 */
export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Check if a plan gives access to premium features
 */
export function isPremiumPlan(planType: string): boolean {
  return planType !== "FREE";
}

/**
 * Relative time: "2 hours ago", "3 days ago"
 */
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return past.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
