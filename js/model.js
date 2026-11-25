// Datenmodell: Vorlagen, Fabrikfunktionen, Übernahme aus dem Vorjahr, Demo-Daten.
import { uid } from './format.js';

export const SCHEMA_VERSION = 1;

export const SCHLUESSEL = {
  flaeche: { kurz: 'm² × Tage', lang: 'Wohnfläche × Tage' },
  personen: { kurz: 'Personen × Tage', lang: 'Personen × Tage' },
  einheit: { kurz: 'Wohnung × Tage', lang: 'je Wohneinheit × Tage' },
  verbrauch: { kurz: 'Verbrauch', lang: 'Verbrauch laut Zähler' },
};

/** Betriebskostenarten nach § 2 BetrKV (Bezeichnungen wie in der bisherigen Excel-Vorlage). */
export const KOSTENARTEN = [
  ['Grundsteuer', 'flaeche'],
  ['Wasserkosten', 'verbrauch'],
  ['Abwasser', 'verbrauch'],
  ['Heizkosten', 'flaeche'],
  ['Zentrale Wasserbereitung', 'flaeche'],
  ['Verb. Heizungs- und Warmwasserversorgungsanlagen', 'flaeche'],
  ['Fahrstuhl', 'flaeche'],
  ['Straßenreinigung / Müllabfuhr / Winterdienst', 'flaeche'],
  ['Hausreinigung / Ungezieferbeseitigung', 'flaeche'],
  ['Gartenpflege', 'flaeche'],
  ['Beleuchtung', 'flaeche'],
  ['Schornsteinreinigung', 'flaeche'],
  ['Versicherungen', 'flaeche'],
  ['Hauswart', 'flaeche'],
  ['Gemeinschaftsantenne / Breitbandkabel', 'einheit'],
  ['Wascheinrichtungen', 'einheit'],
  ['Sonstige Kosten', 'flaeche'],
];

export const DEFAULT_HINWEIS =
  'Bitte überweisen Sie eine Nachzahlung innerhalb von 4 Wochen ab Abrechnungsdatum.\n' +
  'Ein Guthaben erstatten wir Ihnen innerhalb von 4 Wochen.\n' +
  'Bitte ändern Sie ggf. Ihren Dauerauftrag bei Ihrer Bank oder Sparkasse. Danke!';

export function neuesObjekt(vorlage = null) {
  return {
    id: uid(),
    name: '',
    strasse: '',
    plzOrt: '',
    wohnungen: [],
    zaehlerarten: [{ id: 'kw', name: 'Kaltwasser', einheit: 'm³' }],
    vermieter: vorlage?.vermieter
      ? { ...vorlage.vermieter }
      : { name: '', anschrift: '', kontakt: '', bank: '', logo: null },
    jahre: [],
  };
}

export const neueWohnung = (nr = 1) => ({ id: uid(), bezeichnung: `WE ${nr}`, lage: '', flaeche: null });

export function kostenVorlage(zaehlerartId = 'kw') {
  return KOSTENARTEN.map(([name, schluessel]) => ({
    id: uid(), name, betrag: null, schluessel,
    zaehlerart: schluessel === 'verbrauch' ? zaehlerartId : null, notiz: '',
  }));
}

export function neuesJahr(objekt, jahr) {
  return {
    id: uid(),
    jahr,
    von: `${jahr}-01-01`,
    bis: `${jahr}-12-31`,
    kosten: kostenVorlage(objekt.zaehlerarten[0]?.id || 'kw'),
    mietverhaeltnisse: [],
    abrechnungsdatum: null,
    hinweis: DEFAULT_HINWEIS,
  };
}

export function neuesMietverhaeltnis(wohnungId, jahr, vorgaenger = null) {
  return {
    id: uid(),
    wohnungId,
    mieter: '',
    personen: null,
    von: jahr.von,
    bis: jahr.bis,
    vermieter: false,
    zaehler: vorgaenger
      ? Object.fromEntries(Object.entries(vorgaenger.zaehler || {}).map(([k, v]) => [k, { alt: v?.neu ?? null, neu: null }]))
      : {},
    vorauszahlungen: Array(12).fill(null),
    neuerAbschlag: null,
  };
}

/** Neues Abrechnungsjahr aus dem Vorjahr: Kostenarten mit Schlüsseln (ohne Beträge),
 *  Mieter, die am Ende des Vorjahres noch wohnten, Zählerstand neu -> alt,
 *  Vorauszahlungen = neuer Abschlag (falls gesetzt) bzw. letzte Monatsrate. */
export function jahrAusVorjahr(objekt, vorjahr, jahr) {
  const j = neuesJahr(objekt, jahr);
  j.kosten = vorjahr.kosten.map(k => ({ ...k, id: uid(), vorjahr: k.betrag ?? null, betrag: null, notiz: '' }));
  j.hinweis = vorjahr.hinweis ?? DEFAULT_HINWEIS;
  for (const m of vorjahr.mietverhaeltnisse) {
    if (m.bis < vorjahr.bis) continue; // ausgezogen
    const vz = m.neuerAbschlag ?? [...(m.vorauszahlungen || [])].reverse().find(v => v != null) ?? null;
    j.mietverhaeltnisse.push({
      ...neuesMietverhaeltnis(m.wohnungId, j, m),
      mieter: m.mieter,
      personen: m.personen,
      vermieter: !!m.vermieter,
      vorauszahlungen: Array(12).fill(vz),
    });
  }
  return j;
}

export function leereDaten() {
  return { version: SCHEMA_VERSION, objekte: [], ui: { objektId: null, jahrId: null, view: 'start' } };
}

/** Eingelesene Daten prüfen und auf das aktuelle Schema bringen. Wirft bei ungültigen Daten. */
export function normalisiere(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.objekte)) throw new Error('Keine gültige Nebenkosten-Datei.');
  const okLogo = s => typeof s === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  for (const o of d.objekte) {
    o.id ||= uid();
    o.wohnungen ||= [];
    o.zaehlerarten ||= [{ id: 'kw', name: 'Kaltwasser', einheit: 'm³' }];
    o.vermieter ||= { name: '', anschrift: '', kontakt: '', bank: '', logo: null };
    if (o.vermieter.logo && !okLogo(o.vermieter.logo)) o.vermieter.logo = null;
    o.jahre ||= [];
    for (const j of o.jahre) {
      j.id ||= uid();
      j.kosten ||= [];
      j.mietverhaeltnisse ||= [];
      j.hinweis ??= DEFAULT_HINWEIS;
      for (const m of j.mietverhaeltnisse) {
        m.id ||= uid();
        m.zaehler ||= {};
        m.vorauszahlungen = Array.from({ length: 12 }, (_, i) => m.vorauszahlungen?.[i] ?? null);
      }
    }
  }
  d.version = SCHEMA_VERSION;
  d.ui ||= { objektId: null, jahrId: null, view: 'start' };
  return d;
}

/** Erfundenes Beispielobjekt zum Ausprobieren. */
export function demoObjekt() {
  const o = neuesObjekt();
  Object.assign(o, { name: 'Musterhaus', strasse: 'Musterstraße 1', plzOrt: '12345 Musterstadt' });
  o.vermieter = { name: 'Muster Vermietung GbR', anschrift: 'Beispielweg 2\n12345 Musterstadt', kontakt: 'E-Mail: info@example.org\nTel.: 01234 567890', bank: 'IBAN DE00 0000 0000 0000 0000 00', logo: null };
  const w = [['WE 1', 'EG links', 62], ['WE 2', 'EG rechts', 48], ['WE 3', 'OG', 75]].map(([b, l, f]) => ({ id: uid(), bezeichnung: b, lage: l, flaeche: f }));
  o.wohnungen = w;
  const j = neuesJahr(o, 2025);
  const betraege = { Grundsteuer: 480, Wasserkosten: 1250, Abwasser: 980, 'Straßenreinigung / Müllabfuhr / Winterdienst': 720, Beleuchtung: 95.4, Schornsteinreinigung: 180.25, Versicherungen: 1650, Hauswart: 600 };
  for (const k of j.kosten) if (betraege[k.name] != null) k.betrag = betraege[k.name];
  const mv = (wi, mieter, personen, von, bis, alt, neu, vz) => ({
    ...neuesMietverhaeltnis(w[wi].id, j), mieter, personen, von, bis,
    zaehler: { kw: { alt, neu } }, vorauszahlungen: Array.from({ length: 12 }, (_, i) => (i + 1 >= +von.slice(5, 7) && i + 1 <= +bis.slice(5, 7) ? vz : null)),
  });
  j.mietverhaeltnisse = [
    mv(0, 'Erika Beispiel', 2, '2025-01-01', '2025-12-31', 410.2, 478.6, 120),
    mv(1, 'Max Mustermann', 1, '2025-01-01', '2025-06-30', 220.0, 241.5, 90),
    mv(1, 'Familie Test', 3, '2025-08-01', '2025-12-31', 241.5, 268.0, 110),
    mv(2, 'Anna Probe', 2, '2025-01-01', '2025-12-31', 812.7, 890.1, 140),
  ];
  o.jahre.push(j);
  return o;
}
