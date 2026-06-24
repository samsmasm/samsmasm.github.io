/**
 * Talkonomics domain proxy — Cloudflare Worker.
 *
 * Route: talkonomics.com/*   (zone must be proxied / orange-cloud).
 *
 * talkonomics.com cannot be a second GitHub Pages custom domain (Pages allows
 * one per repo, already used by unisam.nz). So this worker fronts the
 * talkonomics.com zone and transparently serves content from the existing
 * GitHub Pages origin (canonical host: unisam.nz). The browser address bar
 * stays talkonomics.com (no redirect), which is what lets pages detect the
 * brand later via location.hostname.
 *
 * Mapping (Phase 1, permissive mirror):
 *   talkonomics.com/            -> unisam.nz/talkonomics/   (the homepage)
 *   talkonomics.com/<anything>  -> unisam.nz/<anything>     (businews, econnews, ...)
 *
 * NOTE: permissive means all of unisam.nz is reachable under talkonomics.com
 * too. Fine for launch. To tighten later, replace the fall-through with an
 * allowlist of paths (e.g. /, /businews, /econnews, /ibecon, /ibbm, assets).
 */

const ORIGIN = 'https://unisam.nz';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Root of talkonomics.com serves the Talkonomics homepage.
    const path = (url.pathname === '/' || url.pathname === '')
      ? '/talkonomics/'
      : url.pathname;

    // Pull the same path from the canonical origin and return it unchanged.
    return fetch(ORIGIN + path + url.search, request);
  },
};
