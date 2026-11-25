// Nebensache – Copyright (C) 2026 Wolfgang Stubig
// SPDX-License-Identifier: GPL-3.0-or-later
// Berechnung der Betriebskostenabrechnung. Reine Funktionen, kein DOM.
import { tage, overlap, isISO, r2, deDate, num } from './format.js';
import { SCHLUESSEL } from './model.js';

const verbrauchVon = r => {
  const alt = r?.alt, neu = r?.neu;
  return alt != null && neu != null ? neu - alt : null;
};

/**
 * @returns {{
 *   tage:number, basis:object, posten:object[], mieter:object[], vermieterAnteil:object,
 *   summeKosten:number, summeVerteilt:number, warnungen:{art:'fehler'|'warnung'|'info', text:string}[]
 * }}
 */
export function berechne(objekt, jahr) {
  const warnungen = [];
  const warn = (art, text) => warnungen.push({ art, text });
  const valid = isISO(jahr.von) && isISO(jahr.bis) && jahr.bis >= jahr.von;
  if (!valid) warn('fehler', 'Abrechnungszeitraum ist unvollständig.');
  const D = valid ? tage(jahr.von, jahr.bis) : 0;
  const wohnungen = new Map(objekt.wohnungen.map(w => [w.id, w]));
  const zArten = objekt.zaehlerarten || [];

  // --- Mietverhältnisse aufbereiten
  const mv = jahr.mietverhaeltnisse.map(m => {
    const w = wohnungen.get(m.wohnungId);
    const t = valid && w ? overlap(m.von, m.bis, jahr.von, jahr.bis) : 0;
    const name = m.vermieter ? (m.mieter || 'Leerstand / Vermieter') : (m.mieter || '(ohne Namen)');
    if (!w) warn('fehler', `${name}: keine Wohnung zugeordnet.`);
    else if (!isISO(m.von) || !isISO(m.bis)) warn('fehler', `${name} (${w.bezeichnung}): Mietzeitraum unvollständig.`);
    else if (t === 0) warn('warnung', `${name} (${w.bezeichnung}): Mietzeitraum liegt außerhalb des Abrechnungszeitraums.`);
    const verbrauch = {};
    for (const z of zArten) verbrauch[z.id] = verbrauchVon(m.zaehler?.[z.id]);
    return {
      m, w, name, tage: t,
      flaeche: (w?.flaeche || 0) * t,
      personen: (m.personen || 0) * t,
      einheit: t,
      verbrauch,
    };
  });

  // --- Wohnungen: Überschneidungen, Leerstand, Zählerübergabe
  for (const w of objekt.wohnungen) {
    if (!(w.flaeche > 0)) warn('warnung', `${w.bezeichnung}: keine Wohnfläche eingetragen.`);
    const liste = mv.filter(x => x.w === w && x.tage > 0).sort((a, b) => (a.m.von < b.m.von ? -1 : 1));
    let belegt = 0;
    for (let i = 0; i < liste.length; i++) {
      belegt += liste[i].tage;
      const n = liste[i + 1];
      if (!n) continue;
      if (n.m.von <= liste[i].m.bis) warn('fehler', `${w.bezeichnung}: Mietzeiträume von ${liste[i].name} und ${n.name} überschneiden sich.`);
      for (const z of zArten) {
        const a = liste[i].m.zaehler?.[z.id]?.neu, b = n.m.zaehler?.[z.id]?.alt;
        if (a != null && b != null && a !== b)
          warn('warnung', `${w.bezeichnung}: ${z.name}-Zählerstand beim Wechsel passt nicht (${liste[i].name} neu ${num(a)}, ${n.name} alt ${num(b)}).`);
      }
    }
    if (valid && belegt < D) {
      const frei = D - Math.min(belegt, D);
      warn('info', `${w.bezeichnung}: ${frei} Tage ohne Mieter – dieser Anteil wird dem Vermieter zugerechnet.`);
    }
  }

  // --- Verteilungsgrundlagen (Leerstand bei Fläche und Wohnungen geht automatisch zu Lasten des Vermieters)
  const sumFl = objekt.wohnungen.reduce((s, w) => s + (w.flaeche || 0), 0);
  const basis = {
    flaeche: sumFl * D,
    einheit: objekt.wohnungen.length * D,
    personen: mv.reduce((s, x) => s + x.personen, 0),
    verbrauch: Object.fromEntries(zArten.map(z => [z.id, mv.reduce((s, x) => s + (x.tage > 0 ? x.verbrauch[z.id] || 0 : 0), 0)])),
  };

  const basisVon = k => (k.schluessel === 'verbrauch' ? basis.verbrauch[k.zaehlerart] ?? 0 : basis[k.schluessel] ?? 0);
  const eigenVon = (k, x) => {
    if (x.tage <= 0) return 0;
    if (k.schluessel === 'verbrauch') return x.verbrauch[k.zaehlerart] ?? 0;
    return x[k.schluessel] ?? 0;
  };

  // --- Kostenposten prüfen
  const posten = [];
  const verbrauchsKosten = new Map(); // Zählerart -> Namen der Kostenarten
  for (const k of jahr.kosten) {
    const betrag = k.betrag || 0;
    if (!betrag) { posten.push({ k, betrag: 0, basis: basisVon(k) }); continue; }
    if (!SCHLUESSEL[k.schluessel]) warn('fehler', `${k.name}: kein Umlageschlüssel gewählt.`);
    if (k.schluessel === 'verbrauch') {
      const z = zArten.find(z => z.id === k.zaehlerart);
      if (!z) warn('fehler', `${k.name}: keine Zählerart gewählt.`);
      else verbrauchsKosten.set(z, [...(verbrauchsKosten.get(z) || []), k.name]);
    }
    if (k.schluessel === 'personen') {
      for (const x of mv.filter(x => x.tage > 0 && !x.m.vermieter && !(x.m.personen > 0)))
        warn('warnung', `${x.name}: keine Personenzahl, erhält bei „${k.name}“ keinen Anteil.`);
    }
    posten.push({ k, betrag, basis: basisVon(k) });
  }
  // Zählerstände je Zählerart nur einmal prüfen, auch wenn mehrere Kostenarten sie nutzen
  for (const [z, namen] of verbrauchsKosten) {
    for (const x of mv.filter(x => x.tage > 0)) {
      const r = x.m.zaehler?.[z.id];
      if (r?.alt == null || r?.neu == null) warn('fehler', `${x.name} (${x.w.bezeichnung}): ${z.name}-Zählerstand fehlt.`);
      else if (r.neu < r.alt) warn('fehler', `${x.name} (${x.w.bezeichnung}): ${z.name}-Zählerstand neu ist kleiner als alt.`);
    }
    if (!(basis.verbrauch[z.id] > 0)) warn('fehler', `Gesamtverbrauch ${z.name} ist 0 – ${namen.join(', ')} können nicht verteilt werden.`);
  }

  // --- Anteile je Mietverhältnis
  const mieter = mv.map(x => {
    const zeilen = posten.map(p => {
      const eigen = eigenVon(p.k, x);
      const anteil = p.betrag && p.basis > 0 ? (p.betrag * eigen) / p.basis : 0;
      return { kosten: p.k, gesamt: p.betrag, eigen, basis: p.basis, anteil, gerundet: r2(anteil) };
    });
    const summe = zeilen.reduce((s, z) => s + z.anteil, 0);
    const summeGerundet = r2(zeilen.reduce((s, z) => s + z.gerundet, 0));
    const vz = r2((x.m.vorauszahlungen || []).reduce((s, v) => s + (v || 0), 0));
    const saldo = r2(vz - summeGerundet); // > 0 Guthaben, < 0 Nachzahlung
    const aktivAmEnde = valid && x.tage > 0 && x.m.bis >= jahr.bis;
    const vorschlag = aktivAmEnde && x.tage > 0 ? Math.ceil((summe / x.tage) * 365 / 12) : null;
    return {
      ...x, zeilen, summe, summeGerundet, vorauszahlungen: vz, saldo,
      abschlagVorschlag: vorschlag,
      neuerAbschlag: aktivAmEnde ? (x.m.neuerAbschlag ?? vorschlag) : null,
    };
  });

  // --- Vermieteranteil (Leerstand + als Vermieter markierte Einträge) und Kontrolle
  const summeKosten = posten.reduce((s, p) => s + p.betrag, 0);
  const summeMieter = mieter.filter(x => !x.m.vermieter).reduce((s, x) => s + x.summe, 0);
  const vermieterAnteil = {
    leerstand: posten.reduce((s, p) => s + p.betrag, 0) - mieter.reduce((s, x) => s + x.summe, 0),
    markiert: mieter.filter(x => x.m.vermieter).reduce((s, x) => s + x.summe, 0),
  };
  vermieterAnteil.gesamt = summeKosten - summeMieter;

  return { tage: D, basis, posten, mieter, vermieterAnteil, summeKosten, summeVerteilt: summeMieter, warnungen };
}

/** Kurztext zur Berechnung eines Anteils, z. B. „55 m² × 365 Tage von 157.315“. */
export function berechnungsText(zeile, x, zaehlerarten = []) {
  const k = zeile.kosten;
  if (!zeile.gesamt) return '';
  switch (k.schluessel) {
    case 'flaeche': return `${num(x.w?.flaeche || 0)} m² × ${x.tage} Tage = ${num(zeile.eigen)} von ${num(zeile.basis)}`;
    case 'personen': return `${num(x.m.personen || 0)} Pers. × ${x.tage} Tage = ${num(zeile.eigen)} von ${num(zeile.basis)}`;
    case 'einheit': return `${x.tage} Tage von ${num(zeile.basis)} Wohnungstagen`;
    case 'verbrauch': {
      const z = zaehlerarten.find(z => z.id === k.zaehlerart);
      return `${num(zeile.eigen)} ${z?.einheit || ''} von ${num(zeile.basis)} ${z?.einheit || ''}`.replace(/\s+/g, ' ').trim();
    }
    default: return '';
  }
}

export const zeitraumText = (von, bis) => `${deDate(von)} – ${deDate(bis)}`;
