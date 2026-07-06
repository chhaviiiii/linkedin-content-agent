import { loadConfig, saveConfig } from './config.js';
import { createClient } from './client.js';
import type { LinkedInAuth, LinkedInClient } from './types.js';

const BROWSER_LOGOUT_WARNING =
  'Note: LinkedIn often logs your browser out when cookies are used here. ' +
  'For drafting/voice, skip login — use `agent voice --from-file` instead.';

export function browserLogoutWarning(): string {
  return BROWSER_LOGOUT_WARNING;
}

function parseSetCookie(header: string): Partial<LinkedInAuth> {
  const patch: Partial<LinkedInAuth> = {};
  const jsession = header.match(/JSESSIONID="?([^";\s]+)"?/i);
  if (jsession?.[1]) patch.jsessionid = jsession[1].replace(/^"|"$/g, '');
  const liat = header.match(/(?:^|,\s*)li_at=([^;\s]+)/i);
  if (liat?.[1]) patch.liAt = liat[1];
  return patch;
}

/** Create a client that persists rotated cookies back to ~/.linkedin-cli/config.json */
export async function createSessionClient(
  auth: LinkedInAuth,
): Promise<{ client: LinkedInClient; auth: LinkedInAuth }> {
  let current = { ...auth };

  const persist = async (patch: Partial<LinkedInAuth>): Promise<void> => {
    current = { ...current, ...patch };
    const config = await loadConfig();
    await saveConfig({
      li_at: current.liAt,
      jsessionid: current.jsessionid,
      profile_name: config?.profile_name,
      profile_urn: config?.profile_urn,
    });
  };

  const client = createClient(current, {
    onAuthUpdate: (patch) => {
      void persist(patch);
    },
  });

  return { client, auth: current };
}

export function applySetCookieHeader(
  auth: LinkedInAuth,
  setCookie: string | null,
): Partial<LinkedInAuth> {
  if (!setCookie) return {};
  return parseSetCookie(setCookie);
}
