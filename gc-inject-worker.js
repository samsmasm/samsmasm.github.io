/**
 * GoatCounter injector — Cloudflare Worker.
 *
 * Appends the GoatCounter analytics snippet to HTML responses on a curated set
 * of routes (homepage + a few sections), so generated pages (econnews/businews)
 * and static ones get tracked without editing files. Non-HTML responses pass
 * through untouched. Deployed as Worker "gc-inject".
 *
 * Routes: unisam.nz/  unisam.nz/index.html  unisam.nz/econnews/*
 *         unisam.nz/businews/*  unisam.nz/quiz/*  unisam.nz/typurr/*
 *         unisam.nz/mortgage/*
 */
const SNIPPET =
  '<script data-goatcounter="https://samsmasm.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';

export default {
  async fetch(request) {
    const res = await fetch(request); // -> origin (GitHub Pages)
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return res;
    return new HTMLRewriter()
      .on('body', { element(el) { el.append(SNIPPET, { html: true }); } })
      .transform(res);
  },
};
