import { Command } from 'commander';
import { saveConfig } from '../../core/config.js';
import { createSessionClient, browserLogoutWarning } from '../../core/session.js';
import { output, outputError } from '../../core/output.js';
import type { GlobalOptions } from '../../core/types.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Store LinkedIn cookies for publishing only (may log browser out)')
    .option('--li-at <cookie>', 'li_at cookie value (from browser DevTools)')
    .option('--jsessionid <cookie>', 'JSESSIONID cookie value (from browser DevTools)')
    .option('--verify', 'Verify cookies with a live API call (more likely to log browser out)')
    .action(async function (this: Command) {
      const localOpts = this.opts() as Record<string, string | boolean | undefined>;
      const globalOpts = this.optsWithGlobals() as GlobalOptions & Record<string, string | boolean | undefined>;

      try {
        console.error(browserLogoutWarning());

        let liAt = (localOpts.liAt ?? globalOpts.liAt) as string | undefined;
        let jsessionid = (localOpts.jsessionid ?? globalOpts.jsessionid) as string | undefined;
        const verify = Boolean(localOpts.verify);

        if (!liAt || !jsessionid) {
          const { promptLine } = await import('../../core/prompt.js');

          if (!liAt) {
            liAt = await promptLine(
              'Paste your li_at cookie (DevTools → Application → Cookies → linkedin.com): ',
            );
          }
          if (!jsessionid) {
            jsessionid = await promptLine(
              'Paste your JSESSIONID cookie (include ajax: prefix if present): ',
            );
          }
        }

        if (!liAt || !jsessionid) {
          throw new Error('Both li_at and JSESSIONID cookies are required');
        }

        jsessionid = jsessionid.replace(/^["']|["']$/g, '');

        await saveConfig({ li_at: liAt, jsessionid });

        if (!verify) {
          output({
            message: 'Cookies saved (no API call — safer for your browser session)',
            config: '~/.linkedin-cli/config.json',
            validated: false,
            tip: 'Use only for `linkedin posts create`. Agent drafting needs no login.',
          }, globalOpts);
          return;
        }

        try {
          const { client } = await createSessionClient({ liAt, jsessionid });
          const me = await client.get<any>('/me');
          const profileName = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'Unknown';
          const profileUrn = me?.entityUrn ?? me?.publicIdentifier ?? '';

          await saveConfig({
            li_at: liAt,
            jsessionid,
            profile_name: profileName,
            profile_urn: profileUrn,
          });

          output({
            message: 'Login successful',
            profile: profileName,
            urn: profileUrn,
            config: '~/.linkedin-cli/config.json',
            validated: true,
            warning: 'Your browser LinkedIn session may now be logged out — this is normal.',
          }, globalOpts);
        } catch (validationErr: any) {
          output({
            message: 'Cookies saved but verification failed',
            warning: validationErr?.message ?? String(validationErr),
            config: '~/.linkedin-cli/config.json',
            validated: false,
          }, globalOpts);
        }
      } catch (error) {
        outputError(error, globalOpts);
      }
    });
}

export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Remove stored LinkedIn session cookies')
    .action(async () => {
      const globalOpts = program.optsWithGlobals() as GlobalOptions;
      try {
        const { deleteConfig } = await import('../../core/config.js');
        await deleteConfig();
        output({ message: 'Logged out. Session cookies removed.' }, globalOpts);
      } catch (error) {
        outputError(error, globalOpts);
      }
    });
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Check login status (reads config only; --verify hits LinkedIn API)')
    .option('--verify', 'Make an API call to verify the session (may log browser out)')
    .action(async function (this: Command) {
      const localOpts = this.opts() as Record<string, boolean | undefined>;
      const globalOpts = this.optsWithGlobals() as GlobalOptions;
      try {
        const { loadConfig } = await import('../../core/config.js');
        const config = await loadConfig();

        if (!config?.li_at || !config?.jsessionid) {
          output({ logged_in: false, message: 'No session cookies stored. Run: linkedin login' }, globalOpts);
          return;
        }

        if (!localOpts.verify) {
          output({
            logged_in: true,
            profile: config.profile_name || 'Unknown',
            urn: config.profile_urn || '',
            config: '~/.linkedin-cli/config.json',
            note: 'Use --verify to check live (may log browser out)',
          }, globalOpts);
          return;
        }

        const { client } = await createSessionClient({ liAt: config.li_at, jsessionid: config.jsessionid });
        try {
          const me = await client.get<any>('/me');
          const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ');
          output({
            logged_in: true,
            profile: name || config.profile_name || 'Unknown',
            urn: me?.entityUrn || config.profile_urn,
            session_valid: true,
          }, globalOpts);
        } catch (err: any) {
          const isAuthError = err?.code === 'AUTH_ERROR' || err?.statusCode === 401;
          if (isAuthError) {
            output({
              logged_in: true,
              profile: config.profile_name || 'Unknown',
              session_valid: false,
              message: 'Session cookies expired. Run: linkedin login',
            }, globalOpts);
          } else {
            output({
              logged_in: true,
              profile: config.profile_name || 'Unknown',
              session_valid: 'unknown',
              message: `Could not verify session: ${err?.message ?? err}`,
            }, globalOpts);
          }
        }
      } catch (error) {
        outputError(error, globalOpts);
      }
    });
}
