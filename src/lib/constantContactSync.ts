/**
 * Calls the Vercel serverless route after sign-up with marketing consent.
 * Same-origin on Vercel; set VITE_APP_ORIGIN if the SPA is hosted elsewhere.
 */
export async function requestConstantContactSync(idToken: string): Promise<void> {
  const origin = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? '';
  const url = `${origin}/api/constant-contact-sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({idToken}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[Constant Contact sync]', res.status, text);
  }
}
