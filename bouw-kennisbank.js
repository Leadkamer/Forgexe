/* Bouwt de kennisbank voor de chatbot uit de HTML van de site.
   Draai dit na elke inhoudelijke wijziging:  node bouw-kennisbank.js

   Resultaat:
     kennisbank/index.txt   overzicht van alle pagina's (gaat in de systeemprompt)
     kennisbank/<slug>.txt  platte tekst per pagina (haalt de bot zelf op)
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const UIT = path.join(ROOT, 'kennisbank');

/* Pagina's die de bot niets opleveren */
const OVERSLAAN = [
  '404.html',
  'newsletter-zomer-automatiseren.html',
  'De reis van een lead.html'
];

var entiteiten = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&euro;': 'EUR ', '&middot;': '·', '&eacute;': 'é', '&euml;': 'ë',
  '&egrave;': 'è', '&uuml;': 'ü', '&ouml;': 'ö', '&iuml;': 'ï',
  '&auml;': 'ä', '&ccedil;': 'ç', '&rsquo;': "'", '&lsquo;': "'",
  '&ldquo;': '"', '&rdquo;': '"', '&mdash;': ', ', '&ndash;': '-',
  '&minus;': 'nee', '&#10003;': 'ja', '&hellip;': '...', '&times;': 'x',
  '&#39;': "'", '&apos;': "'"
};

function ontdoe(t){
  Object.keys(entiteiten).forEach(function(e){
    t = t.split(e).join(entiteiten[e]);
  });
  t = t.replace(/&#(\d+);/g, function(m, code){ return String.fromCharCode(code); });
  t = t.replace(/&#x([0-9a-f]+);/gi, function(m, code){ return String.fromCharCode(parseInt(code, 16)); });
  return t.replace(/&[a-z]+;/gi, ' ');
}

function tekstUit(html){
  var h = html;
  /* techniek en navigatie eruit: die staan op elke pagina en zijn ruis */
  h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  h = h.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  h = h.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  h = h.replace(/<head[\s\S]*?<\/head>/gi, ' ');
  h = h.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  h = h.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ');
  /* blokelementen worden regeleindes, zodat lijstjes leesbaar blijven */
  h = h.replace(/<\/(p|div|li|h1|h2|h3|h4|tr|section|summary|details)>/gi, '\n');
  h = h.replace(/<(br|\/td|\/th)[^>]*>/gi, ' | ');
  h = h.replace(/<[^>]*>/g, ' ');
  h = ontdoe(h);
  h = h.split('\n').map(function(r){
    return r.replace(/[ \t]+/g, ' ').replace(/ \| /g, ' | ').trim();
  }).filter(function(r){ return r.length > 1; }).join('\n');
  return h.replace(/\n{3,}/g, '\n\n');
}

function meta(html, naam){
  var m = html.match(new RegExp('<meta name="' + naam + '" content="([^"]*)"'));
  return m ? ontdoe(m[1]).trim() : '';
}

function titel(html){
  var m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? ontdoe(m[1]).replace(/\s*\|\s*Forgexe.*$/i, '').trim() : '';
}

if (fs.existsSync(UIT)) fs.rmSync(UIT, { recursive: true });
fs.mkdirSync(UIT);

var index = [];
var totaal = 0;

fs.readdirSync(ROOT)
  .filter(function(f){ return f.endsWith('.html') && OVERSLAAN.indexOf(f) === -1; })
  .sort()
  .forEach(function(f){
    var html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    var slug = f.replace(/\.html$/, '');
    var tekst = tekstUit(html);
    if (tekst.length < 200) return;

    var kop = 'PAGINA: /' + (slug === 'index' ? '' : slug) + '\n'
            + 'TITEL: ' + titel(html) + '\n'
            + 'OMSCHRIJVING: ' + meta(html, 'description') + '\n\n';

    fs.writeFileSync(path.join(UIT, slug + '.txt'), kop + tekst, 'utf8');
    totaal += tekst.length;
    index.push({ slug: slug, titel: titel(html), omschrijving: meta(html, 'description') });
  });

var regels = ['OVERZICHT VAN ALLE PAGINAS OP FORGEXE.NL', ''];
index.forEach(function(p){
  regels.push(p.slug + ' — ' + (p.omschrijving || p.titel));
});
fs.writeFileSync(path.join(UIT, 'index.txt'), regels.join('\n'), 'utf8');

console.log('kennisbank gebouwd: ' + index.length + ' paginas, '
  + Math.round(totaal / 1000) + 'k tekens (~' + Math.round(totaal / 4000) + 'k tokens)');
console.log('index.txt: ' + Math.round(regels.join('\n').length / 4) + ' tokens');
