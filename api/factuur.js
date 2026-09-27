/*
 * POST /api/factuur — factuur-PDF voor de juridische AI-training (Peters Advocatuur × Forgexe).
 *
 * Body (JSON):
 *   { nummer: 'TR-2026-001', datum: '2026-09-27', termijn: 14,
 *     klant: { kantoor, tav, adres, postcode, plaats, email, kenmerk },
 *     deelnemers: ['mr. J. de Vries'], prijs: 690, btw: 21 }
 *
 * De afzender (IAM 333 B.V.) en het rekeningnummer staan bewust vast in deze functie:
 * een aanroeper kan geen ander IBAN op een factuur in deze huisstijl zetten.
 * Ontbrekende afzendergegevens worden als [..] getoond en de header X-Factuur-Compleet is dan 'nee'.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const config = { runtime: 'edge' };

var AFZENDER = {
  naam: 'IAM 333 B.V.',
  handelsnaam: 'Peters Advocatuur',
  adres: null,          // straat + huisnummer, nog aan te leveren door John
  postcodePlaats: null, // bijv. '6041 XX Roermond'
  kvk: '77744721',
  btw: 'NL861122082B01',
  iban: 'NL92 RABO 0166 8058 07',
  tenaamstelling: 'IAM 333 B.V.'
};

var TRAINING = {
  titel: 'Trainingsdag "Verantwoord werken met AI, binnen het beroepsgeheim"',
  detail: 'Donderdag 22 oktober 2026 · op locatie bij Peters Advocatuur, Roermond · 7 PO-punten',
  datumKort: '22 okt 2026',
  noot: 'De trainingsdag omvat zeven netto contacturen, lunch, de spelregelkaart en een deelnamebewijs met programma en urenspecificatie, waarmee advocaten de 7 PO-punten zelf registreren bij de Orde (art. 4.4 lid 5 VODA).'
};

function hex(h) {
  var n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
var C = {
  navy: hex('#1B2A55'), navyDeep: hex('#111D3E'), green: hex('#34d399'), greenBright: hex('#4ade80'),
  greenPale: hex('#E6F9F1'), cloud: hex('#F6F8FC'), slate: hex('#4A5568'), slateLight: hex('#718096'),
  ink: hex('#1A1F2E'), border: hex('#DEE5F0'), white: rgb(1, 1, 1), todo: hex('#B7791F'), greenLine: hex('#9BE5C8')
};

/* fonts: statische TTF's via Google Fonts css2 (zelfde aanpak als /api/post-image) */
var fontCache = {};
async function loadFont(family, weight, italic) {
  var key = family + ':' + weight + (italic ? 'i' : '');
  if (fontCache[key]) return fontCache[key];
  var spec = italic ? 'ital,wght@1,' + weight : 'wght@' + weight;
  var css = await (await fetch('https://fonts.googleapis.com/css2?family=' + family.replace(/ /g, '+') + ':' + spec)).text();
  var m = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!m) throw new Error('Geen TTF-bron gevonden voor ' + key);
  var data = await (await fetch(m[1])).arrayBuffer();
  fontCache[key] = data;
  return data;
}

function s(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 200); }
function euro(n) {
  var parts = (Math.round(n * 100) / 100).toFixed(2).split('.');
  return '€ ' + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1];
}
var MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
function datumNL(d) { return d.getUTCDate() + ' ' + MAANDEN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }

function wrap(text, font, size, width) {
  var words = String(text).split(/\s+/);
  var lines = [];
  var line = '';
  words.forEach(function (w) {
    var test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = w; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

export default async function handler(req) {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }
    if (req.method !== 'POST') return new Response('Gebruik POST met JSON', { status: 405 });
    var b = await req.json();
    var k = b.klant || {};
    var nummer = s(b.nummer, 40);
    var namen = (Array.isArray(b.deelnemers) ? b.deelnemers : []).map(function (x) { return s(x, 80); }).filter(Boolean).slice(0, 12);
    if (!nummer || !namen.length) return new Response('nummer en minimaal één deelnemer zijn verplicht', { status: 400 });
    var prijs = Number(b.prijs); if (!(prijs >= 0)) prijs = 690;
    var btwPct = Number(b.btw); if (!(btwPct >= 0)) btwPct = 21;
    var termijn = parseInt(b.termijn, 10); if (!(termijn >= 0)) termijn = 14;
    var d = /^\d{4}-\d{2}-\d{2}$/.test(s(b.datum)) ? new Date(s(b.datum) + 'T12:00:00Z') : new Date();
    var verval = new Date(d.getTime() + termijn * 86400000);

    var incompleet = !AFZENDER.adres || !AFZENDER.postcodePlaats || !AFZENDER.kvk || !AFZENDER.btw;

    var fonts = await Promise.all([
      loadFont('Outfit', 400), loadFont('Outfit', 600), loadFont('Outfit', 700), loadFont('Playfair Display', 700)
    ]);
    var pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    var F = {
      reg: await pdf.embedFont(fonts[0], { subset: true }),
      semi: await pdf.embedFont(fonts[1], { subset: true }),
      bold: await pdf.embedFont(fonts[2], { subset: true }),
      serif: await pdf.embedFont(fonts[3], { subset: true })
    };
    pdf.setTitle('Factuur ' + nummer + ' — Peters Advocatuur');
    pdf.setAuthor('IAM 333 B.V. h.o.d.n. Peters Advocatuur');

    var W = 595.28, H = 841.89, M = 45.35; // A4, marge 16 mm
    var page = pdf.addPage([W, H]);
    function text(t, x, y, font, size, color, opts) {
      opts = opts || {};
      var tx = x;
      if (opts.align === 'right') tx = x - font.widthOfTextAtSize(t, size);
      if (opts.spacing) {
        // letterspatiëring voor labels
        var cx = tx;
        if (opts.align === 'right') cx = x - (font.widthOfTextAtSize(t, size) + opts.spacing * (t.length - 1));
        for (var i = 0; i < t.length; i++) {
          page.drawText(t[i], { x: cx, y: y, size: size, font: font, color: color });
          cx += font.widthOfTextAtSize(t[i], size) + opts.spacing;
        }
        return;
      }
      page.drawText(t, { x: tx, y: y, size: size, font: font, color: color });
    }
    function label(t, x, y) {
      page.drawCircle({ x: x + 2, y: y + 2.4, size: 2, color: C.green });
      text(t.toUpperCase(), x + 8, y, F.bold, 7, C.slateLight, { spacing: 1 });
    }
    function field(v, placeholder) { return v ? { t: v, todo: false } : { t: '[' + placeholder + ']', todo: true }; }

    /* ── kop ── */
    var headH = 134;
    // verloop navy-deep → navy in smalle stroken (pdf-lib kent geen gradients)
    var from = [0x0E, 0x17, 0x30], to = [0x2A, 0x3E, 0x6E], steps = 60;
    for (var g = 0; g < steps; g++) {
      var t = g / (steps - 1);
      page.drawRectangle({ x: (W / steps) * g, y: H - headH, width: W / steps + 1, height: headH,
        color: rgb((from[0] + (to[0] - from[0]) * t) / 255, (from[1] + (to[1] - from[1]) * t) / 255, (from[2] + (to[2] - from[2]) * t) / 255) });
    }
    var scales = 'M32 10 V52 M22 52 H42 M12 18 H52 M12 18 L6 30 M12 18 L18 30 M4 30 a8 5 0 0 0 16 0 M52 18 L46 30 M52 18 L58 30 M44 30 a8 5 0 0 0 16 0';
    page.drawSvgPath(scales, { x: M, y: H - 38, scale: 0.4, borderColor: C.white, borderWidth: 2.6 });
    text('Peters Advocatuur', M + 34, H - 60, F.serif, 16, C.white);
    text('in samenwerking met', M + 34, H - 76, F.reg, 9, hex('#AEB6C8'));
    var fx = M + 34 + F.reg.widthOfTextAtSize('in samenwerking met', 9) + 5;
    page.drawSvgPath('M25 20 h12 v80 h-12 z M25 20 h55 v10 h-55 z M25 52 h40 v8 h-40 z M76 52 L100 68 L76 84 z', { x: fx - 2, y: H - 67, scale: 0.075, color: C.green });
    text('Forgexe', fx + 7, H - 76, F.bold, 9, C.green);
    text('Factuur', W - M, H - 66, F.serif, 26, C.white, { align: 'right' });
    text(nummer, W - M, H - 84, F.semi, 10, C.greenBright, { align: 'right' });

    /* ── partijen ── */
    var y = H - headH - 44;
    var colB = M + (W - 2 * M) / 2 + 17;
    label('Van', M, y);
    label('Aan', colB, y);
    var van = [
      { t: AFZENDER.naam, bold: true }, { t: 'h.o.d.n. ' + AFZENDER.handelsnaam },
      field(AFZENDER.adres, 'adres'), field(AFZENDER.postcodePlaats, 'postcode en plaats'),
      { t: 'KvK ' + (AFZENDER.kvk || '[KvK-nummer]'), todo: !AFZENDER.kvk }, { t: 'Btw ' + (AFZENDER.btw || '[btw-nummer]'), todo: !AFZENDER.btw }
    ];
    var aan = [field(s(k.kantoor, 90), 'kantoor')];
    aan[0].bold = true;
    if (s(k.tav)) aan.push({ t: 't.a.v. ' + s(k.tav, 90) });
    aan.push(field(s(k.adres, 90), 'adres'));
    aan.push(field((s(k.postcode, 12) + ' ' + s(k.plaats, 60)).trim(), 'postcode en plaats'));
    if (s(k.email)) aan.push({ t: s(k.email, 90) });
    function block(lines, x, y0) {
      lines.forEach(function (l, i) {
        text(l.t, x, y0 - i * 15, l.bold ? F.semi : F.reg, 9.5, l.todo ? C.todo : C.ink);
      });
    }
    block(van, M, y - 18);
    block(aan, colB, y - 18);

    /* ── meta-strook ── */
    y = y - 18 - 6 * 15 - 18;
    var metaH = 40, cw = (W - 2 * M) / 4;
    page.drawRectangle({ x: M, y: y - metaH, width: W - 2 * M, height: metaH, color: C.cloud, borderColor: C.border, borderWidth: 0.8 });
    var meta = [['Factuurdatum', datumNL(d)], ['Vervaldatum', datumNL(verval)], ['Trainingsdatum', TRAINING.datumKort], ['Kenmerk', s(k.kenmerk, 30) || '—']];
    meta.forEach(function (m, i) {
      var mx = M + i * cw;
      if (i) page.drawLine({ start: { x: mx, y: y }, end: { x: mx, y: y - metaH }, thickness: 0.8, color: C.border });
      text(m[0].toUpperCase(), mx + 10, y - 14, F.bold, 6.8, C.slateLight, { spacing: 0.8 });
      text(m[1], mx + 10, y - 30, F.semi, 10, C.navyDeep);
    });

    /* ── regels ── */
    y = y - metaH - 34;
    var xAantal = W - M - 150, xPrijs = W - M - 72, xBedrag = W - M;
    text('OMSCHRIJVING', M, y, F.bold, 7, C.slateLight, { spacing: 0.9 });
    text('AANTAL', xAantal, y, F.bold, 7, C.slateLight, { spacing: 0.9, align: 'right' });
    text('PRIJS', xPrijs, y, F.bold, 7, C.slateLight, { spacing: 0.9, align: 'right' });
    text('BEDRAG', xBedrag, y, F.bold, 7, C.slateLight, { spacing: 0.9, align: 'right' });
    y -= 7;
    page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: 1.6, color: C.navy });
    var descW = xAantal - M - 30;
    namen.forEach(function (n) {
      var titelLines = wrap(TRAINING.titel, F.semi, 9.5, descW);
      var detailLines = wrap(TRAINING.detail, F.reg, 8.5, descW);
      var yy = y - 17;
      titelLines.forEach(function (l, i) { text(l, M, yy - i * 13, F.semi, 9.5, C.navyDeep); });
      yy -= titelLines.length * 13;
      detailLines.forEach(function (l, i) { text(l, M, yy - i * 12, F.reg, 8.5, C.slate); });
      yy -= detailLines.length * 12;
      text('Deelnemer: ' + n, M, yy, F.reg, 8.5, C.slate);
      text('1', xAantal, y - 17, F.reg, 9.5, C.ink, { align: 'right' });
      text(euro(prijs), xPrijs, y - 17, F.reg, 9.5, C.ink, { align: 'right' });
      text(euro(prijs), xBedrag, y - 17, F.reg, 9.5, C.ink, { align: 'right' });
      y = yy - 14;
      page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: 0.8, color: C.border });
    });

    /* ── totalen ── */
    var sub = Math.round(prijs * namen.length * 100) / 100;
    var btw = Math.round(sub * btwPct) / 100;
    var tot = sub + btw;
    var tx0 = W - M - 221;
    y -= 22;
    text('Subtotaal excl. btw', tx0, y, F.reg, 9.5, C.ink);
    text(euro(sub), W - M, y, F.reg, 9.5, C.ink, { align: 'right' });
    y -= 20;
    text('Btw ' + String(btwPct).replace('.', ',') + '%', tx0, y, F.reg, 9.5, C.ink);
    text(euro(btw), W - M, y, F.reg, 9.5, C.ink, { align: 'right' });
    y -= 14;
    page.drawRectangle({ x: tx0, y: y - 30, width: 221, height: 30, color: C.navyDeep });
    text('Totaal te voldoen', tx0 + 12, y - 19.5, F.bold, 11, C.white);
    text(euro(tot), W - M - 12, y - 19.5, F.bold, 11, C.greenBright, { align: 'right' });

    /* ── betaalblok + noot (onderaan) ── */
    var footY = 42;
    var notLines = wrap(TRAINING.noot, F.reg, 8, W - 2 * M);
    var noteTop = footY + 34 + notLines.length * 11.5;
    notLines.forEach(function (l, i) { text(l, M, noteTop - 11 - i * 11.5, F.reg, 8, C.slate); });
    var payText = 'Graag het totaalbedrag van ' + euro(tot) + ' vóór ' + datumNL(verval) + ' overmaken op ' + AFZENDER.iban +
      ' t.n.v. ' + AFZENDER.tenaamstelling + ', onder vermelding van factuurnummer ' + nummer + '.';
    var payLines = wrap(payText, F.reg, 9.5, W - 2 * M - 28);
    var payH = 22 + payLines.length * 14;
    var payY = noteTop + 14;
    page.drawRectangle({ x: M, y: payY, width: W - 2 * M, height: payH, color: C.greenPale, borderColor: C.greenLine, borderWidth: 0.8 });
    payLines.forEach(function (l, i) { text(l, M + 14, payY + payH - 19 - i * 14, F.reg, 9.5, C.ink); });

    /* ── voet ── */
    page.drawLine({ start: { x: 0, y: footY + 14 }, end: { x: W, y: footY + 14 }, thickness: 0.8, color: C.border });
    var foot = AFZENDER.naam + ' h.o.d.n. ' + AFZENDER.handelsnaam + '     KvK ' + (AFZENDER.kvk || '[KvK]') +
      '     Btw ' + (AFZENDER.btw || '[btw]') + '     IBAN ' + AFZENDER.iban;
    text(foot, M, footY - 4, F.reg, 7.5, C.slateLight);

    var bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="factuur-' + nummer.replace(/[^A-Za-z0-9-]/g, '') + '.pdf"',
        'X-Factuur-Compleet': incompleet ? 'nee' : 'ja',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-Factuur-Compleet',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex'
      }
    });
  } catch (e) {
    return new Response('factuur error: ' + (e && e.message ? e.message : e), { status: 500 });
  }
}
