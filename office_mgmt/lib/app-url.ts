/**
 * Base URL used for email links (invites, password reset).
 * Set NEXTAUTH_URL or AUTH_URL in production to your public URL (e.g. https://office-mgmt.co.uk)
 * so invite and reset links use the correct domain.
 */
export function getBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
