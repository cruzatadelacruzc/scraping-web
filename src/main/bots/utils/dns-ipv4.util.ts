import dns from 'dns';

/**
 * Forces IPv4 DNS resolution for specific bot provider hostnames.
 *
 * When BOT_FORCE_IPV4 is set (e.g. "telegram,whatsapp"), this module
 * wraps {@link dns.lookup} so that any resolution of the corresponding
 * hostname uses `family: 4`. All other hostnames are left untouched.
 *
 * This is a side-effect module — importing it applies the patch.
 *
 * @example
 *   # .env
 *   BOT_FORCE_IPV4=telegram,whatsapp
 */

/** Maps provider names to their API hostnames. */
const PROVIDER_HOSTS: Record<string, string> = {
  telegram: 'api.telegram.org',
  whatsapp: 'web.whatsapp.com',
};

const providers = (process.env.BOT_FORCE_IPV4 ?? '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const forceIpv4Hosts = providers.map(p => PROVIDER_HOSTS[p]).filter(Boolean);

if (forceIpv4Hosts.length > 0) {
  const originalLookup = dns.lookup;

  dns.lookup = function (hostname: string, opts: any, cb?: any): void {
    if (forceIpv4Hosts.includes(hostname)) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = { family: 4 };
      } else if (typeof opts === 'object') {
        opts = { ...opts, family: 4 };
      } else {
        opts = { family: 4 };
      }
    }

    return (originalLookup as any)(hostname, opts as any, cb as any);
  } as any;
}
