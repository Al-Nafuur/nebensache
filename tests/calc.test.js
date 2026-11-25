// Tests für Berechnung und Datenmodell. Ausführen: tests/index.html im Browser öffnen (über einen Webserver).
import { berechne } from '../js/calc.js';
import { jahrAusVorjahr, normalisiere, demoObjekt, neuesJahr } from '../js/model.js';
import { parseNum, r2 } from '../js/format.js';
import * as fx from './fixture-excel-2025.js';

const out = [];
let fehler = 0, ok = 0;
function test(name, fn) {
  try { fn(); ok++; out.push(`✓ ${name}`); } catch (e) { fehler++; out.push(`✗ ${name}\n    ${e.message}`); }
}
function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} erwartet ${JSON.stringify(b)}, erhalten ${JSON.stringify(a)}`); }
function nah(a, b, tol = 1e-6, msg = '') { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg} erwartet ${b}, erhalten ${a}`); }
function wahr(v, msg) { if (!v) throw new Error(msg); }
const clone = x => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------- Vergleich mit der Excel-Vorlage
test('Excel-Vergleich 2025: Tage, Kostenanteil und Vorauszahlungen je Mieter', () => {
  const r = berechne(fx.objekt, fx.jahr);
  for (const e of fx.erwartet) {
    const x = r.mieter.find(x => x.m.id === e.id);
    eq(x.tage, e.tage, `${e.id} Tage:`);
    nah(x.summe, e.summe, 1e-6, `${e.id} Kosten:`);
    nah(x.vorauszahlungen, e.vz, 1e-9, `${e.id} Vorauszahlungen:`);
  }
});
test('Excel-Vergleich 2025: Verteilungsgrundlagen (m²×Tage 157.315, Verbrauch 274)', () => {
  const r = berechne(fx.objekt, fx.jahr);
  eq(r.basis.flaeche, fx.gesamt.flaecheTage);
  nah(r.basis.verbrauch.kw, fx.gesamt.verbrauch, 1e-9);
});
test('Excel-Vergleich 2025: Summe aller Anteile = Gesamtkosten, kein Vermieteranteil', () => {
  const r = berechne(fx.objekt, fx.jahr);
  nah(r.summeKosten, fx.gesamt.kosten, 1e-9);
  nah(r.summeVerteilt, fx.gesamt.kosten, 1e-6);
  nah(r.vermieterAnteil.gesamt, 0, 1e-6);
});
test('Excel-Vergleich 2025: keine Fehler, aber Hinweis auf Zählerstand beim Mieterwechsel', () => {
  const r = berechne(fx.objekt, fx.jahr);
  eq(r.warnungen.filter(w => w.art === 'fehler').length, 0, 'Fehler:');
  wahr(r.warnungen.some(w => w.text.includes('beim Wechsel passt nicht')), 'Wechsel-Hinweis fehlt');
});

// ---------------------------------------------------------------- Kleine Szenarien
function szenario({ flaechen = [50, 50], mv, kosten, zaehlerarten = [{ id: 'kw', name: 'Kaltwasser', einheit: 'm³' }] }) {
  const objekt = { wohnungen: flaechen.map((f, i) => ({ id: `w${i}`, bezeichnung: `WE ${i + 1}`, flaeche: f })), zaehlerarten };
  const jahr = { jahr: 2025, von: '2025-01-01', bis: '2025-12-31', kosten, mietverhaeltnisse: mv.map((m, i) => ({ id: `m${i}`, vorauszahlungen: Array(12).fill(null), zaehler: {}, ...m })) };
  return berechne(objekt, jahr);
}
test('Leerstand: Anteil leerstehender Tage trägt der Vermieter', () => {
  const r = szenario({
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-12-31' },
      { wohnungId: 'w1', mieter: 'B', von: '2025-07-01', bis: '2025-12-31' }],
    kosten: [{ name: 'Grundsteuer', betrag: 1000, schluessel: 'flaeche' }],
  });
  nah(r.mieter[0].summe, 500);
  nah(r.mieter[1].summe, 1000 * 50 * 184 / (100 * 365));
  nah(r.vermieterAnteil.leerstand, 1000 - 500 - 1000 * 50 * 184 / (100 * 365));
  wahr(r.warnungen.some(w => w.art === 'info' && w.text.includes('181 Tage ohne Mieter')), 'Leerstand-Hinweis fehlt');
});
test('Schlüssel Personen × Tage', () => {
  const r = szenario({
    mv: [{ wohnungId: 'w0', mieter: 'A', personen: 1, von: '2025-01-01', bis: '2025-12-31' },
      { wohnungId: 'w1', mieter: 'B', personen: 3, von: '2025-01-01', bis: '2025-12-31' }],
    kosten: [{ name: 'Müll', betrag: 400, schluessel: 'personen' }],
  });
  nah(r.mieter[0].summe, 100);
  nah(r.mieter[1].summe, 300);
});
test('Schlüssel je Wohneinheit × Tage', () => {
  const r = szenario({
    flaechen: [30, 90],
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-12-31' },
      { wohnungId: 'w1', mieter: 'B', von: '2025-01-01', bis: '2025-12-31' }],
    kosten: [{ name: 'Kabel', betrag: 240, schluessel: 'einheit' }],
  });
  nah(r.mieter[0].summe, 120);
  nah(r.mieter[1].summe, 120);
});
test('Schlüssel Verbrauch, eigene Zählerart', () => {
  const r = szenario({
    zaehlerarten: [{ id: 'kw', name: 'Kaltwasser', einheit: 'm³' }, { id: 'ww', name: 'Warmwasser', einheit: 'm³' }],
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-12-31', zaehler: { kw: { alt: 0, neu: 10 }, ww: { alt: 5, neu: 6 } } },
      { wohnungId: 'w1', mieter: 'B', von: '2025-01-01', bis: '2025-12-31', zaehler: { kw: { alt: 0, neu: 30 }, ww: { alt: 0, neu: 3 } } }],
    kosten: [{ name: 'Wasser', betrag: 400, schluessel: 'verbrauch', zaehlerart: 'kw' }, { name: 'Warmwasser', betrag: 100, schluessel: 'verbrauch', zaehlerart: 'ww' }],
  });
  nah(r.mieter[0].summe, 100 + 25);
  nah(r.mieter[1].summe, 300 + 75);
});
test('Rundung: Summe der gerundeten Posten, Ergebnis = Vorauszahlungen − Kosten', () => {
  const r = szenario({
    flaechen: [1, 1, 1],
    mv: [0, 1, 2].map(i => ({ wohnungId: `w${i}`, mieter: `M${i}`, von: '2025-01-01', bis: '2025-12-31', vorauszahlungen: Array(12).fill(1) })),
    kosten: [{ name: 'A', betrag: 100, schluessel: 'flaeche' }, { name: 'B', betrag: 100, schluessel: 'flaeche' }],
  });
  const x = r.mieter[0];
  eq(x.zeilen[0].gerundet, 33.33);
  eq(x.summeGerundet, 66.66);
  eq(x.saldo, r2(12 - 66.66));
  eq(x.abschlagVorschlag, Math.ceil(x.summe / 365 * 365 / 12));
});
test('Prüfung: überschneidende Mietzeiträume und Zählerstand neu < alt sind Fehler', () => {
  const r = szenario({
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-06-30', zaehler: { kw: { alt: 10, neu: 5 } } },
      { wohnungId: 'w0', mieter: 'B', von: '2025-06-01', bis: '2025-12-31', zaehler: { kw: { alt: 5, neu: 9 } } }],
    kosten: [{ name: 'Wasser', betrag: 100, schluessel: 'verbrauch', zaehlerart: 'kw' }],
  });
  const f = r.warnungen.filter(w => w.art === 'fehler').map(w => w.text).join(' | ');
  wahr(f.includes('überschneiden'), 'Überschneidung nicht erkannt: ' + f);
  wahr(f.includes('kleiner als alt'), 'Zählerfehler nicht erkannt: ' + f);
});
test('Prüfung: fehlender Zählerstand bei Verbrauchskosten ist ein Fehler', () => {
  const r = szenario({
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-12-31', zaehler: { kw: { alt: 1, neu: null } } }],
    kosten: [{ name: 'Wasser', betrag: 100, schluessel: 'verbrauch', zaehlerart: 'kw' }],
  });
  wahr(r.warnungen.some(w => w.art === 'fehler' && w.text.includes('Zählerstand fehlt')), 'nicht erkannt');
});

test('Prüfung: fehlender Zählerstand wird je Zählerart nur einmal gemeldet (Wasser + Abwasser)', () => {
  const r = szenario({
    mv: [{ wohnungId: 'w0', mieter: 'A', von: '2025-01-01', bis: '2025-12-31', zaehler: { kw: { alt: 1, neu: null } } }],
    kosten: [{ name: 'Wasser', betrag: 100, schluessel: 'verbrauch', zaehlerart: 'kw' }, { name: 'Abwasser', betrag: 80, schluessel: 'verbrauch', zaehlerart: 'kw' }],
  });
  eq(r.warnungen.filter(w => w.text.includes('Zählerstand fehlt')).length, 1, 'Meldungen „fehlt“:');
  wahr(r.warnungen.some(w => w.text.includes('Wasser, Abwasser können nicht verteilt werden')), 'Sammelmeldung fehlt');
});

// ---------------------------------------------------------------- Datenmodell
test('Neues Jahr aus Vorjahr: Ausgezogene fallen weg, Zähler neu → alt, neue Vorauszahlung', () => {
  const o = clone(fx.objekt);
  const vj = clone(fx.jahr);
  vj.mietverhaeltnisse.find(m => m.id === 'm9').neuerAbschlag = 95;
  const j = jahrAusVorjahr(o, vj, 2026);
  eq(j.von, '2026-01-01'); eq(j.bis, '2026-12-31');
  eq(j.mietverhaeltnisse.length, 8, 'Anzahl Mieter:');
  wahr(!j.mietverhaeltnisse.some(m => m.mieter === 'Mieter Zeile 27'), 'ausgezogener Mieter übernommen');
  const m9 = j.mietverhaeltnisse.find(m => m.mieter === 'Mieter Zeile 9');
  nah(m9.zaehler.kw.alt, 1024.3, 1e-9, 'Zählerstand alt:'); eq(m9.zaehler.kw.neu, null);
  eq(m9.vorauszahlungen.join(','), Array(12).fill(95).join(','));
  eq(j.mietverhaeltnisse.find(m => m.mieter === 'Mieter Zeile 12').vorauszahlungen[0], 130);
  eq(j.kosten.every(k => k.betrag === null), true, 'Beträge nicht geleert:');
  eq(j.kosten[0].vorjahr, 1178.88);
});
test('Zahlen eingeben: Komma, Punkt, Tausenderpunkt, leer', () => {
  eq(parseNum('1.234,56'), 1234.56); eq(parseNum('12,5'), 12.5); eq(parseNum('12.5'), 12.5);
  eq(parseNum(' 90 € '), 90); eq(parseNum(''), null); eq(parseNum('abc'), null); eq(parseNum('-3,5'), -3.5);
});
test('Import: ungültige Daten werden abgelehnt, fremde Logo-Formate entfernt', () => {
  let geworfen = false;
  try { normalisiere({ foo: 1 }); } catch { geworfen = true; }
  wahr(geworfen, 'ungültige Datei nicht abgelehnt');
  const d = normalisiere({ objekte: [{ vermieter: { logo: 'data:image/svg+xml;base64,PHN2Zz4=' }, jahre: [{ mietverhaeltnisse: [{}] }] }] });
  eq(d.objekte[0].vermieter.logo, null);
  eq(d.objekte[0].jahre[0].mietverhaeltnisse[0].vorauszahlungen.length, 12);
  const ok = normalisiere({ objekte: [{ vermieter: { logo: 'data:image/png;base64,iVBORw0KGgo=' } }] });
  eq(ok.objekte[0].vermieter.logo, 'data:image/png;base64,iVBORw0KGgo=');
});
test('Beispielobjekt rechnet ohne Fehler, Leerstand im Juli wird erkannt', () => {
  const o = demoObjekt();
  const r = berechne(o, o.jahre[0]);
  eq(r.warnungen.filter(w => w.art === 'fehler').length, 0, 'Fehler:');
  wahr(r.vermieterAnteil.leerstand > 0, 'kein Leerstandsanteil');
  nah(r.summeVerteilt + r.vermieterAnteil.gesamt, r.summeKosten, 1e-6);
});
test('Leeres neues Jahr enthält alle 17 Kostenarten nach BetrKV', () => {
  const j = neuesJahr({ zaehlerarten: [{ id: 'kw' }] }, 2025);
  eq(j.kosten.length, 17);
  eq(j.kosten.filter(k => k.schluessel === 'verbrauch').every(k => k.zaehlerart === 'kw'), true);
});

// ---------------------------------------------------------------- Ausgabe
document.getElementById('out').textContent = `${ok} bestanden, ${fehler} fehlgeschlagen\n\n` + out.join('\n');
document.title = fehler ? `FEHLER ${fehler}` : `OK ${ok}`;
