// Anschreiben (Einzelabrechnung) je Mieter als HTML für Vorschau und Druck.
import { esc, eur, deDate, todayISO, num } from './format.js';
import { SCHLUESSEL } from './model.js';
import { berechnungsText } from './calc.js';

const zeilen = s => esc(s || '').replace(/\n/g, '<br>');

export function brief(objekt, jahr, ergebnis, x) {
  const v = objekt.vermieter || {};
  const datum = deDate(jahr.abrechnungsdatum || todayISO());
  const ruecksende = [v.name, ...(v.anschrift || '').split('\n')].map(s => s.trim()).filter(Boolean).join(' · ');
  const empf = x.m.anschrift?.trim()
    ? zeilen(x.m.anschrift)
    : [objekt.strasse, objekt.plzOrt].filter(Boolean).map(esc).join('<br>');
  const wohnung = [x.w?.bezeichnung, x.w?.lage].filter(Boolean).join(', ');
  const posten = x.zeilen.filter(z => z.gesamt);
  const ergebnisText = x.saldo < 0 ? 'Nachzahlung' : x.saldo > 0 ? 'Guthaben' : 'Ausgeglichen';

  return `
<article class="brief">
  <header class="brief-kopf">
    ${v.logo ? `<img class="brief-logo" src="${esc(v.logo)}" alt="">` : '<span></span>'}
    <div class="brief-absender"><strong>${esc(v.name)}</strong><br>${zeilen(v.anschrift)}${v.kontakt ? '<br><br>' + zeilen(v.kontakt) : ''}</div>
  </header>
  <div class="brief-adresse">
    <div class="brief-ruecksende">${esc(ruecksende)}</div>
    <div>${esc(x.m.mieter)}<br>${empf}</div>
  </div>
  <div class="brief-datum">Datum: ${esc(datum)}</div>
  <h2 class="brief-titel">Betriebskostenabrechnung ${esc(jahr.jahr)}</h2>
  <p class="brief-betreff">${esc([objekt.strasse, objekt.plzOrt].filter(Boolean).join(', '))}${wohnung ? ' – ' + esc(wohnung) : ''}</p>
  <table class="brief-eckdaten">
    <tr><th>Abrechnungszeitraum</th><td>${deDate(jahr.von)} – ${deDate(jahr.bis)} (${ergebnis.tage} Tage)</td></tr>
    <tr><th>Ihr Nutzungszeitraum</th><td>${deDate(maxD(x.m.von, jahr.von))} – ${deDate(minD(x.m.bis, jahr.bis))} (${x.tage} Tage)</td></tr>
    <tr><th>Wohnfläche / Personen</th><td>${num(x.w?.flaeche || 0)} m² / ${x.m.personen ?? '–'}</td></tr>
  </table>
  <table class="brief-posten">
    <thead><tr><th>Kostenart</th><th class="r">Gesamtkosten</th><th>Umlageschlüssel</th><th>Ihr Anteil am Schlüssel</th><th class="r">Ihre Kosten</th></tr></thead>
    <tbody>
      ${posten.map(z => `<tr>
        <td>${esc(z.kosten.name)}</td>
        <td class="r">${eur(z.gesamt)}</td>
        <td>${esc(SCHLUESSEL[z.kosten.schluessel]?.kurz || '')}</td>
        <td class="klein">${esc(berechnungsText(z, x, objekt.zaehlerarten))}</td>
        <td class="r">${eur(z.gerundet)}</td></tr>`).join('')}
    </tbody>
    <tfoot>
      <tr><td colspan="4">Summe Ihrer Betriebskosten</td><td class="r">${eur(x.summeGerundet)}</td></tr>
      <tr><td colspan="4">abzüglich Ihrer Vorauszahlungen</td><td class="r">${eur(x.vorauszahlungen)}</td></tr>
      <tr class="brief-ergebnis"><td colspan="4">${ergebnisText}</td><td class="r">${eur(Math.abs(x.saldo))}</td></tr>
    </tfoot>
  </table>
  ${x.neuerAbschlag != null ? `<p class="brief-abschlag">Ihre neue monatliche Vorauszahlung auf die Betriebskosten beträgt <strong>${eur(x.neuerAbschlag)}</strong>.</p>` : ''}
  ${jahr.hinweis ? `<p class="brief-hinweis">${zeilen(jahr.hinweis)}</p>` : ''}
  <p class="brief-gruss">Mit freundlichen Grüßen<br><br>${esc(v.name)}</p>
  ${v.bank ? `<footer class="brief-fuss">${zeilen(v.bank)}</footer>` : ''}
</article>`;
}

const maxD = (a, b) => (a > b ? a : b);
const minD = (a, b) => (a < b ? a : b);
