/*
 * GET /api/demo-assistent?klant=mooigroendak&pad=/subsidie/
 *
 * Testweergave: haalt een pagina van de website van de klant op en zet de Forgexe
 * Assistent erop, precies zoals hij straks live staat. Links naar andere pagina's
 * van die site blijven binnen deze demo, zodat de assistent bij elke pagina weet
 * waar je bent (ballonnen, paginacontext, wizard-ballon).
 *
 * Alleen de sites in KLANTEN hieronder (geen open proxy). Niet indexeerbaar.
 * Afbeeldingen, scripts en formulieren blijven naar de echte site wijzen (via
 * <base>), dus de winkelwagen is gewoon de echte winkelwagen.
 */
export const config = { runtime: 'edge' };

var KLANTEN = {
  mooigroendak: {
    site: 'https://www.mooigroendak.nl',
    naam: 'Bram van MooiGroendak',
    avatar: 'https://www.forgexe.nl/assistent-avatars/mooigroendak-bram.png'
  }
};

/* Deze paden laten we naar de echte site gaan: bestanden, WordPress-systeem en het bestelproces */
var NIET_DOORLINKEN = /^\/(wp-admin|wp-content|wp-json|wp-login|wp-includes|winkelwagen|afrekenen|mijn-account|cart|checkout)(\/|$)|\.(pdf|jpe?g|png|gif|webp|svg|zip|kml|xml)$/i;

function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export default async function handler(req) {
  var u = new URL(req.url);
  var klant = u.searchParams.get('klant') || '';
  var k = KLANTEN[klant];
  if (!k) return new Response('Onbekende klant', { status: 404 });
  var basis = new URL(k.site);

  var pad = u.searchParams.get('pad') || '/';
  var doel;
  try { doel = new URL(pad, k.site); } catch (e) { doel = new URL('/', k.site); }
  if (doel.host !== basis.host) doel = new URL('/', k.site);

  var r;
  try {
    r = await fetch(doel.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (Forgexe testweergave)' }, redirect: 'follow' });
  } catch (e) {
    return new Response('De website van de klant is nu niet bereikbaar.', { status: 502 });
  }
  var type = r.headers.get('content-type') || '';
  if (!/text\/html/i.test(type)) return Response.redirect(doel.toString(), 302);
  var html = await r.text();
  var eind = new URL(r.url || doel.toString());

  var demoBasis = u.origin + u.pathname + '?klant=' + encodeURIComponent(klant) + '&pad=';
  var hostZonderWww = basis.host.replace(/^www\./, '');

  /* Trackers eruit: testbezoeken mogen niet meetellen in de analytics en
     advertentiecijfers van de klant (Google Tag Manager/Analytics/Ads, Meta, Hotjar, Clarity). */
  var TRACKER = /googletagmanager|google-analytics|gtag\(|gtm4wp|dataLayer|googleadservices|googlesyndication|fbq\(|connect\.facebook\.net|hotjar|clarity\.ms|leadinfo|linkedin\.com\/px|snap\.licdn/i;
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, function (blok) { return TRACKER.test(blok) ? '' : blok; });
  html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, function (blok) { return TRACKER.test(blok) ? '' : blok; });
  html = html.replace(/<link\b[^>]*(googletagmanager|google-analytics)[^>]*>/gi, '');

  /* Links naar andere pagina's van de klant → via deze demo */
  html = html.replace(/<a\b[^>]*>/gi, function (tag) {
    return tag.replace(/(\shref=)(["'])([^"']*)\2/i, function (m, voor, q, href) {
      if (!href || /^(#|mailto:|tel:|javascript:|whatsapp:)/i.test(href)) return m;
      var abs;
      try { abs = new URL(href.replace(/&amp;/g, '&'), eind); } catch (e) { return m; }
      if (abs.host.replace(/^www\./, '') !== hostZonderWww) return m;
      if (NIET_DOORLINKEN.test(abs.pathname) || /add-to-cart=/.test(abs.search)) return voor + q + attr(abs.toString()) + q;
      return voor + q + attr(demoBasis + encodeURIComponent(abs.pathname + abs.search) + abs.hash) + q;
    });
  });

  /* Relatieve afbeeldingen, scripts en formulieren blijven naar de echte site wijzen */
  html = html.replace(/<head([^>]*)>/i, '<head$1><base href="' + attr(basis.origin + '/') + '">');

  var label = '<div style="position:fixed;left:12px;bottom:12px;z-index:2147482000;background:#0b110e;color:#e9f2ec;font:600 12px/1.3 system-ui,sans-serif;padding:8px 11px;border-radius:8px;opacity:.88;pointer-events:none">Testweergave Forgexe · zo staat ' + attr(k.naam.split(' ')[0]) + ' straks op de site</div>';
  var widget =
    '<script>window.FXA_TEST_PAD=' + JSON.stringify(eind.pathname) + ';</script>' +
    '<script src="https://www.forgexe.nl/assistent.js" data-klant="' + attr(klant) + '" data-naam="' + attr(k.naam) + '" data-avatar="' + attr(k.avatar) + '"></script>';
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, label + widget + '</body>');
  else html += label + widget;

  return new Response(html, {
    status: r.status === 404 ? 404 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, max-age=60'
    }
  });
}
