/*
 * GET /api/post-fotos — de fotobank voor het post-beeld (template t=foto).
 *
 * Leest /post-fotos/fotos.json van de eigen site en geeft die met CORS terug,
 * zodat het HQ-dashboard (ander domein) de lijst kan tonen.
 */
export const config = { runtime: 'edge' };

var FALLBACK = {
  fotos: [
    { key: 'portret', bestand: 'portret.png', label: 'Portret', wanneer: 'algemeen, meningen, quotes' }
  ]
};

export default async function handler(req) {
  var headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=600'
  };
  try {
    var base = new URL(req.url).origin;
    var res = await fetch(base + '/post-fotos/fotos.json', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('fotos.json ' + res.status);
    var data = await res.json();
    var lijst = Array.isArray(data && data.fotos) ? data.fotos : [];
    lijst = lijst.filter(function (f) { return f && f.key; }).map(function (f) {
      return {
        key: String(f.key),
        label: String(f.label || f.key),
        wanneer: String(f.wanneer || ''),
        url: base + '/post-fotos/' + (f.bestand || f.key + '.png')
      };
    });
    if (!lijst.length) throw new Error('lege lijst');
    return new Response(JSON.stringify({ fotos: lijst }), { headers: headers });
  } catch (e) {
    return new Response(JSON.stringify({ fotos: FALLBACK.fotos, fout: String(e && e.message || e) }), { headers: headers });
  }
}
