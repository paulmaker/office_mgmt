/**
 * Base URL used for email links (invites, password reset).
 * Set NEXTAUTH_URL or AUTH_URL in production to your public URL (e.g. https://office-mgmt.co.uk)
 * so invite and reset links use the correct domain.
 * Always returns a full URL with protocol (https:// or http://) so links are clickable.
 */
export function getBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }
  return `https://${raw.replace(/^\/+/, '')}`
}
