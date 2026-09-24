// Checkin - turns a link into a scalable QR code. Kept apart from the rest so
// it can be exercised on its own, and because it is the one piece that leans on
// an outside library (qrcode-generator, loaded as a global by the page).

export function svgFor(text, dark = '#241a33') {
  // Version 0 means the smallest that fits; M is the usual error correction.
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  const pad = 2;
  const size = n + pad * 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (code.isDark(r, c)) path += 'M' + (c + pad) + ' ' + (r + pad) + 'h1v1h-1z';
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" ' +
    'width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
    '<rect width="' + size + '" height="' + size + '" fill="#ffffff"/>' +
    '<path d="' + path + '" fill="' + dark + '"/></svg>';
}
