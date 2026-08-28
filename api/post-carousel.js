/*
 * /api/post-carousel — bundelt carousel-slides tot een PDF (LinkedIn document-post).
 *
 * GET  ?slides=<url-encoded JSON [{title, sub}, ...]>&f=square|portrait&label=...
 * POST { slides: [{title, sub}], f: 'square'|'portrait', label: '...' }
 *
 * Elke slide wordt gerenderd via /api/post-image?t=slide en als pagina in de PDF gezet.
 */
import { PDFDocument } from 'pdf-lib';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    var url = new URL(req.url);
    var slides = null;
    var f = 'square';
    var label = '';
    if (req.method === 'POST') {
      var body = await req.json();
      slides = body.slides;
      f = body.f || f;
      label = body.label || '';
    } else {
      var raw = url.searchParams.get('slides');
      if (raw) slides = JSON.parse(raw);
      f = url.searchParams.get('f') || f;
      label = url.searchParams.get('label') || '';
    }
    if (!Array.isArray(slides) || !slides.length) {
      return new Response('Geen slides meegegeven', { status: 400 });
    }
    slides = slides.slice(0, 10);
    if (f !== 'portrait') f = 'square';
    var dims = f === 'portrait' ? [1080, 1350] : [1080, 1080];
    var count = slides.length;

    var fetches = [];
    for (var i = 0; i < count; i++) {
      var s = slides[i] || {};
      var u = url.origin + '/api/post-image?t=slide&f=' + f + '&n=' + (i + 1) + '&count=' + count +
        '&title=' + encodeURIComponent(String(s.title || '').trim().slice(0, 160)) +
        '&sub=' + encodeURIComponent(String(s.sub || '').trim().slice(0, 200)) +
        (label ? '&eyebrow=' + encodeURIComponent(String(label).trim().slice(0, 60)) : '');
      fetches.push(fetch(u).then(function (r) {
        if (!r.ok) throw new Error('slide-render mislukt (HTTP ' + r.status + ')');
        return r.arrayBuffer();
      }));
    }
    var pngs = await Promise.all(fetches);

    var pdf = await PDFDocument.create();
    for (var j = 0; j < pngs.length; j++) {
      var img = await pdf.embedPng(pngs[j]);
      var page = pdf.addPage([dims[0], dims[1]]);
      page.drawImage(img, { x: 0, y: 0, width: dims[0], height: dims[1] });
    }
    var bytes = await pdf.save();

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="forgexe-carousel.pdf"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return new Response('post-carousel error: ' + (e && e.message ? e.message : e), { status: 500 });
  }
}
