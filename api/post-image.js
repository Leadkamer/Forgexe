/*
 * GET /api/post-image — LinkedIn post-beeld generator (1200×627 PNG).
 *
 * Query-parameters:
 *   t       template: terminal | statement | stat | quote  (default: terminal)
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

function wordmark(dark) {
  return h('div', { style: { display: 'flex', alignItems: 'flex-end' } },
    h('div', { style: { fontFamily: 'Outfit', fontWeight: 800, fontSize: 30, color: dark ? '#ffffff' : INK, letterSpacing: 1 } }, 'forgexe'),
    h('div', { style: { fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 30, color: GREEN } }, '_')
  );
}

function footer(dark) {
  return h('div', { style: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' } },
    wordmark(dark),
    h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: MUT } }, 'www.forgexe.nl')
  );
}

function darkRoot() {
  var children = Array.prototype.slice.call(arguments);
  return h.apply(null, ['div', { style: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    backgroundColor: INK,
    backgroundImage: 'linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    padding: 52
  } }].concat(children));
}

/* ── template: terminal ── */
function tplTerminal(title, sub) {
  var cmd = sub || './nieuwe-post.sh';
  return darkRoot(
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#0d1014', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 18, marginBottom: 30 } },
      h('div', { style: { display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' } },
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#ff5f57', marginRight: 9 } }),
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#febc2e', marginRight: 9 } }),
        h('div', { style: { width: 13, height: 13, borderRadius: 999, backgroundColor: '#28c840' } }),
        h('div', { style: { display: 'flex', marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: 17, color: '#5b6672' } }, 'forgexe — linkedin')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '36px 44px', justifyContent: 'space-between' } },
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
function tplStat(title, sub, eyebrow) {
  return darkRoot(
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
function tplQuote(title, sub) {
  return darkRoot(
    h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 800, fontSize: 120, lineHeight: 0.7, color: GREEN, marginTop: 20 } }, '“'),
    h('div', { style: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' } },
      h('div', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 600, fontSize: fitSize(title, 52, 44, 36), lineHeight: 1.3, color: LIGHT_TXT, maxWidth: 1020 } }, title),
      h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 23, color: GREEN, marginTop: 30 } }, '— ' + (sub || 'Sedat, Forgexe'))
    ),
    footer(true)
  );
}

/* ── template: statement (licht) ── */
function tplStatement(title, sub, eyebrow) {
  return h('div', { style: {
    width: '100%', height: '100%', display: 'flex',
    backgroundColor: '#f4f6f8',
    backgroundImage: 'linear-gradient(rgba(10,11,14,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(10,11,14,0.05) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    padding: 44
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

export default async function handler(req) {
  try {
    var url = new URL(req.url);
    var q = url.searchParams;
    var t = (q.get('t') || 'terminal').toLowerCase();
    var title = (q.get('title') || '').trim().slice(0, 160);
    var sub = (q.get('sub') || '').trim().slice(0, 120);
    var eyebrow = (q.get('eyebrow') || '').trim().slice(0, 60);

    if (!title) {
      title = t === 'stat' ? '24/7' : 'AI-systemen die je bedrijf dag en nacht vooruit duwen';
      if (t === 'stat' && !sub) sub = 'Jouw AI-medewerker werkt door terwijl jij slaapt';
    }

    var tree;
    if (t === 'stat') tree = tplStat(title, sub, eyebrow);
    else if (t === 'quote') tree = tplQuote(title, sub);
    else if (t === 'statement') tree = tplStatement(title, sub, eyebrow);
    else tree = tplTerminal(title, sub);

    var fonts = await Promise.all([
      loadFont('Outfit', 600),
      loadFont('Outfit', 800),
      loadFont('JetBrains Mono', 400),
      loadFont('JetBrains Mono', 700)
    ]);

    return new ImageResponse(tree, {
      width: 1200,
      height: 627,
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
