import { loadConfig } from './config.js';
import { AuthError } from './errors.js';
import type { LinkedInAuth } from './types.js';

export async function resolveAuth(flags?: { liAt?: string; jsessionid?: string }): Promise<LinkedInAuth> {
  // Priority: CLI flags > env vars > config file

  const liAt =
    flags?.liAt ??
    process.env.LINKEDIN_LI_AT ??
    (await loadConfig())?.li_at;

  const jsessionid =
    flags?.jsessionid ??
    process.env.LINKEDIN_JSESSIONID ??
    (await loadConfig())?.jsessionid;

  if (!liAt) {
    throw new AuthError(
      'No li_at cookie found. Set LINKEDIN_LI_AT, use --li-at, or run: linkedin login',
    );
  }

  if (!jsessionid) {
    throw new AuthError(
      'No JSESSIONID cookie found. Set LINKEDIN_JSESSIONID, use --jsessionid, or run: linkedin login',
    );
  }

  return { liAt, jsessionid };
}
