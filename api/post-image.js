/*
 * GET /api/post-image — LinkedIn post-beeld generator (1200×627 PNG).
 *
 * Query-parameters:
 *   t       template: terminal | statement | stat | quote  (default: terminal)
 *   f       formaat: landscape 1200x627 | square 1080x1080 | portrait 1080x1350 | story 1080x1920  (default: landscape)
 *   title   hoofdtekst (terminal/statement/quote) of het grote getal (stat)
 *   sub     subregel: commando (terminal), subtekst (statement), label (stat), naam (quote)
 *   eyebrow optioneel label bovenin (statement/stat)
 */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

var GREEN = '#34d399';
var CYAN = '#00f0ff';
var INK = '#0a0b0e';
var NAVY = '#052e16';
var MUT = '#8d9bb5';
var LIGHT_TXT = '#eef7f1';

/* ── fonts: statische TTF's via Google Fonts css2 (geen browser-UA → truetype) ── */
var fontCache = {};
async function loadFont(family, weight) {
  var key = family + ':' + weight;
  if (fontCache[key]) return fontCache[key];
  var cssUrl = 'https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':wght@' + weight;
  var css = await (await fetch(cssUrl)).text();
  var m = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!m) throw new Error('Geen TTF-bron gevonden voor ' + key);
  var data = await (await fetch(m[1])).arrayBuffer();
  fontCache[key] = data;
  return data;
}

/* ── mini-hyperscript: satori accepteert {type, props} zonder React ── */
function h(type, props) {
  props = props || {};
  var children = Array.prototype.slice.call(arguments, 2);
  if (children.length) props.children = children.length === 1 ? children[0] : children;
  return { type: type, props: props };
}

function fitSize(text, big, mid, small) {
  var len = (text || '').length;
  return len <= 60 ? big : len <= 110 ? mid : small;
}

var MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none"><rect x="25" y="20" width="12" height="80" rx="1" fill="#34d399"/><rect x="25" y="20" width="55" height="10" rx="1" fill="#34d399"/><rect x="25" y="52" width="40" height="8" rx="1" fill="#34d399"/><polygon points="76,52 100,68 76,84" fill="#34d399"/></svg>';
var MARK_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(MARK_SVG);

function wordmark(dark) {
  return h('div', { style: { display: 'flex', alignItems: 'center' } },
    h('img', { src: MARK_URI, width: 46, height: 46 }),
    h('div', { style: { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 23, letterSpacing: 5, color: dark ? '#ffffff' : INK, marginLeft: 4 } }, 'FORGEXE')
  );
}

function footer(dark) {
  return h('div', { style: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' } },
    wordmark(dark),
    h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: MUT } }, 'www.forgexe.nl')
  );
}

function darkRoot(pad) {
  var children = Array.prototype.slice.call(arguments, 1);
  return h.apply(null, ['div', { style: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: INK,
    backgroundImage: 'linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    padding: pad
  } }].concat(children));
}

/* ── template: terminal ── */
function tplTerminal(title, sub, pad, tall) {
  var cmd = sub || './nieuwe-post.sh';
  return darkRoot(pad,
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#0d1014', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 18, marginBottom: 30 } },
      h('div', { style: { display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' } },
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#ff5f57', marginRight: 9 } }),
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#febc2e', marginRight: 9 } }),
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#28c840' } }),
        h('div', { style: { display: 'flex', marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: 17, color: '#5b6672' } }, 'forgexe — social')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '36px 44px', justifyContent: tall ? 'center' : 'space-between', gap: tall ? 52 : 0 } },
        h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22 } },
          h('div', { style: { color: GREEN } }, 'sedat@forgexe'),
          h('div', { style: { color: MUT } }, ':~$'),
          h('div', { style: { color: '#e6edf3', marginLeft: 12 } }, cmd)
        ),
        h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: fitSize(title, 46, 38, 32), lineHeight: 1.35, color: LIGHT_TXT, maxWidth: 1000 } }, title),
        h('div', { style: { display: 'flex', alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 22 } },
          h('div', { style: { color: GREEN } }, 'sedat@forgexe'),
          h('div', { style: { color: MUT } }, ':~$'),
          h('div', { style: { width: 13, height: 26, backgroundColor: GREEN, marginLeft: 12 } })
        )
      )
    ),
    footer(true)
  );
}

/* ── template: stat (groot getal) ── */
function tplStat(title, sub, eyebrow, pad) {
  return darkRoot(pad,
    h('div', { style: { display: 'flex', alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 21, letterSpacing: 3 } },
      h('div', { style: { color: CYAN, marginRight: 14 } }, '//'),
      h('div', { style: { color: GREEN, textTransform: 'uppercase' } }, eyebrow || 'AI-automatisering voor het MKB')
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' } },
      h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: (title || '').length <= 4 ? 210 : (title || '').length <= 7 ? 160 : 110, lineHeight: 1, color: GREEN } }, title),
      h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 600, fontSize: fitSize(sub, 42, 34, 28), lineHeight: 1.25, color: LIGHT_TXT, maxWidth: 950, marginTop: 18 } }, sub || '')
    ),
    footer(true)
  );
}

/* ── template: quote ── */
function tplQuote(title, sub, pad) {
  return darkRoot(pad,
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' } },
      h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: 120, lineHeight: 0.9, color: GREEN, marginBottom: 8 } }, '“'),
      h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 600, fontSize: fitSize(title, 52, 44, 36), lineHeight: 1.3, color: LIGHT_TXT, maxWidth: 1020 } }, title),
      h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 23, color: GREEN, marginTop: 30 } }, '— ' + (sub || 'Sedat, Forgexe'))
    ),
    footer(true)
  );
}

/* ── template: statement (licht) ── */
function tplStatement(title, sub, eyebrow, pad) {
  return h('div', { style: {
    width: '100%', height: '100%', display: 'flex',
    backgroundColor: '#f4f6f8',
    backgroundImage: 'linear-gradient(rgba(10,11,14,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,11,14,0.05) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    padding: pad - 8
  } },
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between', backgroundColor: '#ffffff', border: '1px solid rgba(10,11,14,0.08)', borderRadius: 24, boxShadow: '0 20px 60px rgba(10,11,14,0.06)', padding: '48px 60px' } },
      h('div', { style: { display: 'flex' } },
        h('div', { style: { display: 'flex', backgroundColor: '#d1fae5', color: NAVY, fontFamily: 'JetBrains Mono', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', padding: '10px 18px', borderRadius: 999 } }, eyebrow || 'forgexe // ai-automatisering')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: fitSize(title, 64, 52, 42), lineHeight: 1.12, color: INK, maxWidth: 1000 } }, title),
        h('div', { style: { display: 'flex', width: 96, height: 10, backgroundColor: GREEN, borderRadius: 6, marginTop: 26 } }),
        sub ? h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, lineHeight: 1.5, color: '#475569', maxWidth: 950, marginTop: 22 } }, sub) : h('div', { style: { display: 'flex' } })
      ),
      footer(false)
    )
  );
}

/* ── template: slide (carousel-pagina, donker of licht) ── */
function tplSlide(title, sub, eyebrow, n, count, pad, light) {
  var isLast = n >= count;
  var header = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
    light
      ? h('div', { style: { display: 'flex', backgroundColor: '#d1fae5', color: NAVY, fontFamily: 'JetBrains Mono', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 17px', borderRadius: 999 } }, eyebrow || 'Forgexe // AI-automatisering')
      : h('div', { style: { display: 'flex', alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 20, letterSpacing: 3 } },
          h('div', { style: { color: CYAN, marginRight: 13 } }, '//'),
          h('div', { style: { color: GREEN, textTransform: 'uppercase' } }, eyebrow || 'Forgexe // AI-automatisering')
        ),
    count > 1 ? h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: MUT } }, n + ' / ' + count) : h('div', { style: { display: 'flex' } })
  );
  var body = h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' } },
    h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: n === 1 ? fitSize(title, 76, 62, 50) : fitSize(title, 62, 52, 44), lineHeight: 1.12, color: light ? INK : LIGHT_TXT } }, title),
    sub ? h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 25, lineHeight: 1.55, color: light ? '#475569' : '#9fb0c0', marginTop: 30 } }, sub) : h('div', { style: { display: 'flex' } }),
    isLast ? h('div', { style: { display: 'flex', alignSelf: 'flex-start', backgroundColor: GREEN, color: NAVY, fontFamily: 'Outfit', fontWeight: 700, fontSize: 27, padding: '16px 30px', borderRadius: 999, marginTop: 44 } }, 'www.forgexe.nl') : h('div', { style: { display: 'flex' } })
  );
  var foot = h('div', { style: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' } },
    wordmark(!light),
    isLast
      ? h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: MUT } }, 'www.forgexe.nl')
      : h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: 42, color: GREEN } }, '→')
  );
  if (!light) return darkRoot(pad, header, body, foot);
  return h('div', { style: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: '#f4f6f8',
    backgroundImage: 'linear-gradient(rgba(10,11,14,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,11,14,0.05) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    padding: pad
  } }, header, body, foot);
}

export default async function handler(req) {
  try {
    var url = new URL(req.url);
    var q = url.searchParams;
    var t = (q.get('t') || 'terminal').toLowerCase();
    var title = (q.get('title') || '').trim().slice(0, 160);
    var sub = (q.get('sub') || '').trim().slice(0, 200);
    var eyebrow = (q.get('eyebrow') || '').trim().slice(0, 60);
    var n = parseInt(q.get('n'), 10) || 1;
    var count = parseInt(q.get('count'), 10) || 1;
    var light = (q.get('theme') || '').toLowerCase() === 'light';
    var FORMATS = {
      landscape: [1200, 627],
      square: [1080, 1080],
      portrait: [1080, 1350],
      story: [1080, 1920]
    };
    var f = (q.get('f') || 'landscape').toLowerCase();
    if (!FORMATS[f]) f = 'landscape';
    var dims = FORMATS[f];
    var pad = f === 'story' ? 68 : 52;

    if (!title) {
      title = t === 'stat' ? '24/7' : 'AI-systemen die je bedrijf dag en nacht vooruit duwen';
      if (t === 'stat' && !sub) sub = 'Jouw AI-medewerker werkt door terwijl jij slaapt';
    }

    var tree;
    var tall = dims[1] >= dims[0];
    if (t === 'slide') tree = tplSlide(title, sub, eyebrow, n, count, pad, light);
    else if (t === 'stat') tree = tplStat(title, sub, eyebrow, pad);
    else if (t === 'quote') tree = tplQuote(title, sub, pad);
    else if (t === 'statement') tree = tplStatement(title, sub, eyebrow, pad);
    else tree = tplTerminal(title, sub, pad, tall);

    var fonts = await Promise.all([
      loadFont('Outfit', 600),
      loadFont('Outfit', 800),
      loadFont('JetBrains Mono', 400),
      loadFont('JetBrains Mono', 700)
    ]);

    return new ImageResponse(tree, {
      width: dims[0],
      height: dims[1],
      fonts: [
        { name: 'Outfit', data: fonts[0], weight: 600, style: 'normal' },
        { name: 'Outfit', data: fonts[1], weight: 800, style: 'normal' },
        { name: 'JetBrains Mono', data: fonts[2], weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: fonts[3], weight: 700, style: 'normal' }
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response('post-image error: ' + (e && e.message ? e.message : e), { status: 500 });
  }
}
