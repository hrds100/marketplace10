/**
 * Generates a cross-domain auth bridge URL.
 * Both hub.nfstay.com and nfstay.app share the same Supabase project,
 * so we can pass session tokens to log the user in on the other domain.
 */
export function getBridgeUrl(targetDomain: string, redirectPath: string): string {
  const storageKey = "sb-asazddtvjvmckouxcmmo-auth-token";
  const session = localStorage.getItem(storageKey);
  if (!session) return `${targetDomain}/signin`;

  try {
    const parsed = JSON.parse(session);
    const params = new URLSearchParams({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      redirect: redirectPath,
    });
    return `${targetDomain}/auth/bridge?${params.toString()}`;
  } catch {
    return `${targetDomain}/signin`;
  }
}
