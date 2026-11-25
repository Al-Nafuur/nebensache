// Oberfläche der Nebenkosten-App.
import * as F from './format.js';
import * as M from './model.js';
import { berechne } from './calc.js';
import * as S from './store.js';
import { brief } from './print.js';

export const APP_VERSION = '1.0.0';
const { esc } = F;

let daten = S.laden();
const main = document.getElementById('main');
const kopfWahl = document.getElementById('kopf-wahl');
const nav = document.getElementById('nav');
const statusEl = document.getElementById('status');

const VIEWS = [
  ['start', 'Start'], ['objekt', 'Objekt'], ['mieter', 'Mieter'], ['zaehler', 'Zähler'],
  ['kosten', 'Kosten'], ['ergebnis', 'Ergebnis'], ['druck', 'Drucken'], ['daten', 'Daten'],
];
const BRAUCHT_OBJEKT = new Set(['objekt', 'mieter', 'zaehler', 'kosten', 'ergebnis', 'druck']);
const BRAUCHT_JAHR = new Set(['mieter', 'zaehler', 'kosten', 'ergebnis', 'druck']);
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const find = (arr, id) => arr.find(x => x.id === id);
const sortJahre = o => [...o.jahre].sort((a, b) => b.jahr - a.jahr);

function aktuell() {
  const o = find(daten.objekte, daten.ui.objektId) || daten.objekte[0] || null;
  daten.ui.objektId = o?.id || null;
  let j = o ? find(o.jahre, daten.ui.jahrId) : null;
  if (o && !j) j = sortJahre(o)[0] || null;
  daten.ui.jahrId = j?.id || null;
  return { o, j };
}

// ------------------------------------------------------------------ Speichern
let saveTimer = null;
function persist(sofort = false) {
  clearTimeout(saveTimer);
  const run = () => {
    const ok = S.speichern(daten);
    statusEl.textContent = ok ? 'Lokal gespeichert' : 'Speichern fehlgeschlagen!';
    statusEl.classList.toggle('fehler', !ok);
  };
  if (sofort) run();
  else { statusEl.textContent = 'Speichert …'; saveTimer = setTimeout(run, 300); }
}

// ------------------------------------------------------------------ Bausteine
function inp(k, val, { t = 'text', cls = '', ph = '', attrs = '' } = {}) {
  if (t === 'num') return `<input class="${cls}" data-k="${k}" data-t="num" inputmode="decimal" autocomplete="off" value="${esc(F.inNum(val))}" placeholder="${esc(ph)}" ${attrs}>`;
  if (t === 'date') return `<input type="date" class="${cls}" data-k="${k}" data-t="date" value="${esc(val || '')}" ${attrs}>`;
  return `<input class="${cls}" data-k="${k}" autocomplete="off" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${attrs}>`;
}
const area = (k, val, { ph = '', rows = 3, attrs = '' } = {}) =>
  `<textarea data-k="${k}" rows="${rows}" placeholder="${esc(ph)}" ${attrs}>${esc(val ?? '')}</textarea>`;
const sel = (k, val, opts, attrs = '') =>
  `<select data-k="${k}" ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const feld = (label, control, cls = '') => `<label class="feld ${cls}"><span>${esc(label)}</span>${control}</label>`;
const leer = (text, knopf = '') => `<section class="karte leer"><p>${text}</p>${knopf}</section>`;

function monateImZeitraum(m, j) {
  const y = j.jahr, idx = [];
  for (let i = 0; i < 12; i++) {
    const s = `${y}-${String(i + 1).padStart(2, '0')}-01`;
    const e = `${y}-${String(i + 1).padStart(2, '0')}-${new Date(Date.UTC(y, i + 1, 0)).getUTCDate()}`;
    if (F.overlap(s, e, m.von, m.bis) > 0 && F.overlap(s, e, j.von, j.bis) > 0) idx.push(i);
  }
  return idx;
}
function einheitlicheVZ(m) {
  const werte = m.vorauszahlungen.filter(v => v != null);
  return werte.length && werte.every(v => v === werte[0]) ? werte[0] : null;
}
function plusTage(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ Kopf & Navigation
function renderKopf(o, j) {
  kopfWahl.innerHTML = daten.objekte.length ? `
    <select id="wahl-objekt" aria-label="Objekt">${daten.objekte.map(x => `<option value="${x.id}" ${x === o ? 'selected' : ''}>${esc(x.name || x.strasse || 'Objekt')}</option>`).join('')}</select>
    ${o?.jahre.length ? `<select id="wahl-jahr" aria-label="Abrechnungsjahr">${sortJahre(o).map(x => `<option value="${x.id}" ${x === j ? 'selected' : ''}>${x.jahr}</option>`).join('')}</select>` : ''}` : '';
  nav.innerHTML = VIEWS.map(([v, l]) => `<button data-a="nav" data-v="${v}" class="${daten.ui.view === v ? 'aktiv' : ''}">${l}${v === 'ergebnis' ? '<span class="badge" data-out="fehler-anzahl"></span>' : ''}</button>`).join('');
}

function render() {
  const { o, j } = aktuell();
  const v = VIEWS.some(([x]) => x === daten.ui.view) ? daten.ui.view : 'start';
  renderKopf(o, j);
  let html;
  if (BRAUCHT_OBJEKT.has(v) && !o) html = leer('Noch kein Objekt angelegt.', '<button class="primaer" data-a="objekt-neu">Objekt anlegen</button>');
  else if (BRAUCHT_JAHR.has(v) && !j) html = leer(`Für „${esc(o.name || o.strasse)}“ gibt es noch kein Abrechnungsjahr.`, `<button class="primaer" data-a="jahr-neu-form" data-o="${o.id}">Abrechnungsjahr anlegen</button>`);
  else html = ({ start: viewStart, objekt: viewObjekt, mieter: viewMieter, zaehler: viewZaehler, kosten: viewKosten, ergebnis: viewErgebnis, druck: viewDruck, daten: viewDaten })[v](o, j);
  const y = window.scrollY;
  main.innerHTML = html;
  window.scrollTo(0, y);
  aktualisiereAusgaben();
}

// ------------------------------------------------------------------ Live-Ausgaben ohne Neuaufbau
function aktualisiereAusgaben() {
  const { o, j } = aktuell();
  const map = {};
  if (o) map['fl-summe'] = F.num(o.wohnungen.reduce((s, w) => s + (w.flaeche || 0), 0)) + ' m²';
  if (o && j) {
    const r = berechne(o, j);
    map['kosten-summe'] = F.eur(r.summeKosten);
    map['tage-jahr'] = `${r.tage} Tage`;
    const fehler = r.warnungen.filter(w => w.art === 'fehler').length;
    map['fehler-anzahl'] = fehler ? String(fehler) : '';
    for (const x of r.mieter) {
      map[`tage:${x.m.id}`] = `${x.tage} Tage`;
      map[`vz:${x.m.id}`] = F.eur(x.vorauszahlungen);
      for (const z of o.zaehlerarten) map[`vb:${x.m.id}:${z.id}`] = x.verbrauch[z.id] == null ? '–' : `${F.num(x.verbrauch[z.id])} ${z.einheit}`;
    }
    for (const z of o.zaehlerarten) map[`vb-summe:${z.id}`] = `${F.num(r.basis.verbrauch[z.id])} ${z.einheit}`;
  }
  document.querySelectorAll('[data-out]').forEach(el => {
    const v = map[el.dataset.out];
    if (v !== undefined) el.textContent = v;
    if (el.classList.contains('badge')) el.hidden = !v;
  });
}

// ------------------------------------------------------------------ Ansichten
function viewStart() {
  if (!daten.objekte.length) return `
  <section class="karte willkommen">
    <h2>Willkommen</h2>
    <p>Erstellen Sie Betriebskostenabrechnungen für Ihre Mietobjekte: Kosten erfassen, Zählerstände ablesen, Anteile berechnen und die Anschreiben an die Mieter drucken – auch für mehrere Häuser.</p>
    <p class="hinweis-box">Ihre Daten bleiben ausschließlich in diesem Browser auf diesem Gerät. Nichts wird an einen Server übertragen. Sichern Sie Ihre Daten regelmäßig unter „Daten“.</p>
    <div class="knoepfe">
      <button class="primaer" data-a="objekt-neu">Objekt anlegen</button>
      <button data-a="demo">Beispiel ausprobieren</button>
      <label class="knopf">Sicherung importieren<input type="file" accept="application/json,.json" data-datei="import-ersetzen" hidden></label>
    </div>
  </section>`;
  const tageSeitExport = daten.ui.letzterExport ? Math.floor((Date.now() - Date.parse(daten.ui.letzterExport)) / 864e5) : null;
  const erinnerung = tageSeitExport == null || tageSeitExport > 30
    ? `<section class="karte hinweis-box"><p>${tageSeitExport == null ? 'Sie haben Ihre Daten noch nie gesichert.' : `Ihre letzte Sicherung ist ${tageSeitExport} Tage alt.`} Die Daten liegen nur in diesem Browser.</p><button data-a="export">Jetzt sichern</button></section>` : '';
  return erinnerung + daten.objekte.map(o => {
    const fl = o.wohnungen.reduce((s, w) => s + (w.flaeche || 0), 0);
    const jahre = sortJahre(o);
    const vorschlag = jahre.length ? jahre[0].jahr + 1 : new Date().getFullYear() - 1;
    const form = daten.ui.neuJahr === o.id ? `
      <div class="inline-form">
        ${feld('Jahr', `<input id="neu-jahr" inputmode="numeric" value="${vorschlag}">`, 'kurz')}
        ${jahre.length ? feld('Vorlage', `<select id="neu-vorlage">${jahre.map((x, i) => `<option value="${x.id}" ${i === 0 ? 'selected' : ''}>aus ${x.jahr} übernehmen</option>`).join('')}<option value="">leer (nur Kostenarten)</option></select>`) : ''}
        <div class="knoepfe"><button class="primaer" data-a="jahr-anlegen" data-o="${o.id}">Anlegen</button><button data-a="jahr-neu-abbrechen">Abbrechen</button></div>
        ${jahre.length ? '<p class="leise klein">Übernommen werden Kostenarten mit Schlüsseln, Mieter, die am Jahresende noch wohnten, die Zählerstände (neu → alt) und die neue Vorauszahlung.</p>' : ''}
      </div>` : '';
    return `
    <section class="karte">
      <div class="karte-kopf"><h2>${esc(o.name || o.strasse || 'Objekt')}</h2><span class="leise">${esc([o.strasse, o.plzOrt].filter(Boolean).join(', '))}</span></div>
      <p class="leise">${o.wohnungen.length} Wohnungen · ${F.num(fl)} m²</p>
      <div class="chips">${jahre.map(x => `<button class="chip ${x.id === daten.ui.jahrId && o.id === daten.ui.objektId ? 'aktiv' : ''}" data-a="jahr-waehlen" data-o="${o.id}" data-j="${x.id}">${x.jahr}</button>`).join('') || '<span class="leise">noch kein Abrechnungsjahr</span>'}</div>
      ${form}
      <div class="knoepfe">
        <button data-a="objekt-oeffnen" data-o="${o.id}">Stammdaten</button>
        ${daten.ui.neuJahr === o.id ? '' : `<button data-a="jahr-neu-form" data-o="${o.id}">+ Abrechnungsjahr</button>`}
      </div>
    </section>`;
  }).join('') + `<div class="knoepfe"><button data-a="objekt-neu">+ Weiteres Objekt</button></div>`;
}

function viewObjekt(o) {
  const v = o.vermieter;
  return `
  <section class="karte">
    <h2>Objekt</h2>
    <div class="raster">
      ${feld('Bezeichnung', inp('o::name', o.name, { ph: 'z. B. Haus Lindenstraße' }), 'breit')}
      ${feld('Straße und Hausnummer', inp('o::strasse', o.strasse))}
      ${feld('PLZ und Ort', inp('o::plzOrt', o.plzOrt))}
    </div>
  </section>
  <section class="karte">
    <div class="karte-kopf"><h2>Wohnungen</h2><span class="leise">gesamt <b data-out="fl-summe"></b></span></div>
    <div class="liste">
      ${o.wohnungen.map(w => `
      <div class="zeile wohnung">
        ${feld('Bezeichnung', inp(`w:${w.id}:bezeichnung`, w.bezeichnung))}
        ${feld('Lage', inp(`w:${w.id}:lage`, w.lage, { ph: 'z. B. EG links' }))}
        ${feld('Wohnfläche m²', inp(`w:${w.id}:flaeche`, w.flaeche, { t: 'num' }), 'kurz')}
        <button class="icon" data-a="wohnung-loeschen" data-id="${w.id}" title="Wohnung entfernen" aria-label="Wohnung entfernen">✕</button>
      </div>`).join('') || '<p class="leise">Noch keine Wohnungen.</p>'}
    </div>
    <div class="knoepfe"><button data-a="wohnung-neu">+ Wohnung</button></div>
  </section>
  <section class="karte">
    <h2>Zählerarten</h2>
    <p class="leise">Für Kosten, die nach Verbrauch verteilt werden (z. B. Kaltwasser, Warmwasser, Heizung).</p>
    <div class="liste">
      ${o.zaehlerarten.map(z => `
      <div class="zeile">
        ${feld('Bezeichnung', inp(`z:${z.id}:name`, z.name))}
        ${feld('Einheit', inp(`z:${z.id}:einheit`, z.einheit), 'kurz')}
        <button class="icon" data-a="zaehlerart-loeschen" data-id="${z.id}" title="Zählerart entfernen" aria-label="Zählerart entfernen">✕</button>
      </div>`).join('')}
    </div>
    <div class="knoepfe"><button data-a="zaehlerart-neu">+ Zählerart</button></div>
  </section>
  <section class="karte">
    <h2>Vermieter / Absender</h2>
    <p class="leise">Erscheint im Briefkopf der Abrechnungen.</p>
    <div class="raster">
      ${feld('Name', inp('v::name', v.name, { ph: 'z. B. Muster GbR' }), 'breit')}
      ${feld('Anschrift', area('v::anschrift', v.anschrift, { ph: 'Straße Nr.\nPLZ Ort' }))}
      ${feld('Kontakt', area('v::kontakt', v.kontakt, { ph: 'E-Mail, Telefon' }))}
      ${feld('Fußzeile (z. B. Bankverbindung)', area('v::bank', v.bank, { rows: 2 }), 'breit')}
    </div>
    <div class="logo-feld">
      <div class="logo-vorschau">${v.logo ? `<img src="${esc(v.logo)}" alt="Logo">` : '<span class="leise">kein Logo</span>'}</div>
      <div class="knoepfe">
        <label class="knopf">${v.logo ? 'Logo ändern' : 'Logo wählen'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-datei="logo" hidden></label>
        ${v.logo ? '<button data-a="logo-entfernen">Logo entfernen</button>' : ''}
      </div>
      <p class="leise klein">Das Logo wird verkleinert und nur lokal gespeichert.</p>
    </div>
  </section>
  <section class="karte gefahr-zone"><button class="gefahr" data-a="objekt-loeschen">Objekt mit allen Abrechnungsjahren löschen</button></section>`;
}

function mvKarte(o, j, m) {
  const tageText = `<span data-out="tage:${m.id}"></span>`;
  return `
  <div class="mv ${m.vermieter ? 'mv-vermieter' : ''}">
    <div class="raster">
      ${feld(m.vermieter ? 'Bezeichnung' : 'Mieter', inp(`m:${m.id}:mieter`, m.mieter, { ph: m.vermieter ? 'Leerstand' : 'Name' }), 'breit')}
      ${feld('Personen', inp(`m:${m.id}:personen`, m.personen, { t: 'num' }), 'kurz')}
      ${feld('von', inp(`m:${m.id}:von`, m.von, { t: 'date' }))}
      ${feld('bis', inp(`m:${m.id}:bis`, m.bis, { t: 'date' }))}
      ${feld('Vorauszahlung je Monat €', inp(`mva:${m.id}`, einheitlicheVZ(m), { t: 'num', ph: 'unterschiedlich' }))}
    </div>
    <div class="mv-fuss leise">${tageText} · Vorauszahlungen gesamt <b data-out="vz:${m.id}"></b></div>
    <details>
      <summary>Weitere Angaben</summary>
      <div class="monate">${MONATE.map((mo, i) => feld(mo, inp(`mv:${m.id}:${i}`, m.vorauszahlungen[i], { t: 'num' }))).join('')}</div>
      <label class="check"><input type="checkbox" data-k="m:${m.id}:vermieter" data-t="bool" data-neu ${m.vermieter ? 'checked' : ''}> Leerstand / vom Vermieter genutzt (Anteil trägt der Vermieter, kein Anschreiben)</label>
      ${feld('Abweichende Anschrift für das Anschreiben (z. B. nach Auszug)', area(`m:${m.id}:anschrift`, m.anschrift, { rows: 3 }))}
      <button class="gefahr klein" data-a="mv-loeschen" data-id="${m.id}">Eintrag entfernen</button>
    </details>
  </div>`;
}

function viewMieter(o, j) {
  if (!o.wohnungen.length) return leer('Bitte zuerst unter „Objekt“ die Wohnungen anlegen.', '<button data-a="nav" data-v="objekt">Zu den Wohnungen</button>');
  return `
  <section class="karte">
    <div class="karte-kopf"><h2>Abrechnungsjahr ${j.jahr}</h2><span class="leise" data-out="tage-jahr"></span></div>
    <div class="raster">
      ${feld('Abrechnungszeitraum von', inp('j::von', j.von, { t: 'date' }))}
      ${feld('bis', inp('j::bis', j.bis, { t: 'date' }))}
    </div>
  </section>
  ${o.wohnungen.map(w => {
    const liste = j.mietverhaeltnisse.filter(m => m.wohnungId === w.id).sort((a, b) => (a.von < b.von ? -1 : 1));
    return `
    <section class="karte">
      <div class="karte-kopf"><h2>${esc(w.bezeichnung)}</h2><span class="leise">${esc([w.lage, w.flaeche ? F.num(w.flaeche) + ' m²' : ''].filter(Boolean).join(' · '))}</span></div>
      ${liste.map(m => mvKarte(o, j, m)).join('') || '<p class="leise">Kein Mieter eingetragen – die Wohnung gilt als leerstehend.</p>'}
      <div class="knoepfe"><button data-a="mv-neu" data-w="${w.id}">${liste.length ? '+ Nachmieter' : '+ Mieter'}</button></div>
    </section>`;
  }).join('')}
  <section class="karte gefahr-zone"><button class="gefahr" data-a="jahr-loeschen">Abrechnungsjahr ${j.jahr} löschen</button></section>`;
}

function viewZaehler(o, j) {
  if (!o.zaehlerarten.length) return leer('Keine Zählerarten angelegt.', '<button data-a="nav" data-v="objekt">Zählerarten anlegen</button>');
  const r = berechne(o, j);
  return `
  <section class="karte">
    <h2>Zählerstände ${j.jahr}</h2>
    <p class="leise">Tragen Sie die Stände am besten direkt beim Ablesen ein. Bei einem Mieterwechsel gilt der Stand beim Wechsel als „neu“ für den Vormieter und „alt“ für den Nachmieter.</p>
    <div class="summen">${o.zaehlerarten.map(z => `<span>${esc(z.name)} gesamt: <b data-out="vb-summe:${z.id}"></b></span>`).join('')}</div>
  </section>
  ${o.wohnungen.map(w => {
    const liste = r.mieter.filter(x => x.w === w).sort((a, b) => (a.m.von < b.m.von ? -1 : 1));
    if (!liste.length) return '';
    return `
    <section class="karte">
      <h2>${esc(w.bezeichnung)}${w.lage ? ` <span class="leise">${esc(w.lage)}</span>` : ''}</h2>
      ${liste.map(x => o.zaehlerarten.map(z => `
        <div class="zaehler-zeile">
          <div class="zaehler-name">${esc(x.name)}<small>${esc(z.name)} · ${F.deDate(x.m.von)} – ${F.deDate(x.m.bis)}</small></div>
          ${feld('alt', inp(`mz:${x.m.id}:${z.id}:alt`, x.m.zaehler?.[z.id]?.alt, { t: 'num', cls: 'gross' }))}
          ${feld('neu', inp(`mz:${x.m.id}:${z.id}:neu`, x.m.zaehler?.[z.id]?.neu, { t: 'num', cls: 'gross' }))}
          <div class="zaehler-verbrauch"><span>Verbrauch</span><b data-out="vb:${x.m.id}:${z.id}"></b></div>
        </div>`).join('')).join('')}
    </section>`;
  }).join('')}`;
}

function viewKosten(o, j) {
  const schl = Object.entries(M.SCHLUESSEL).map(([k, v]) => [k, v.lang]);
  const za = o.zaehlerarten.map(z => [z.id, z.name]);
  return `
  <section class="karte">
    <div class="karte-kopf"><h2>Kosten ${j.jahr}</h2><span class="leise">Summe <b data-out="kosten-summe"></b></span></div>
    <p class="leise">Beträge für den Abrechnungszeitraum. Anteile für Leerstand trägt automatisch der Vermieter.</p>
    <div class="kosten-liste">
      ${j.kosten.map(k => `
      <div class="kosten-zeile">
        ${feld('Kostenart', inp(`k:${k.id}:name`, k.name), 'k-name')}
        ${feld('Betrag €', inp(`k:${k.id}:betrag`, k.betrag, { t: 'num', ph: k.vorjahr != null ? 'Vorjahr ' + F.num2(k.vorjahr) : '0,00' }), 'k-betrag')}
        ${feld('Umlageschlüssel', sel(`k:${k.id}:schluessel`, k.schluessel, schl, 'data-neu'), 'k-schl')}
        ${k.schluessel === 'verbrauch' ? feld('Zähler', sel(`k:${k.id}:zaehlerart`, k.zaehlerart, za), 'k-zaehler') : ''}
        ${feld('Beleg / Notiz', inp(`k:${k.id}:notiz`, k.notiz), 'k-notiz')}
        <button class="icon" data-a="kosten-loeschen" data-id="${k.id}" title="Kostenart entfernen" aria-label="Kostenart entfernen">✕</button>
      </div>`).join('')}
    </div>
    <div class="knoepfe"><button data-a="kosten-neu">+ Kostenart</button></div>
  </section>
  <section class="karte hinweis-box klein">
    <p>Heiz- und Warmwasserkosten müssen nach der Heizkostenverordnung überwiegend nach Verbrauch verteilt werden. Legen Sie dafür unter „Objekt“ eine eigene Zählerart an.</p>
  </section>`;
}

function viewErgebnis(o, j) {
  const r = berechne(o, j);
  const sym = { fehler: '✖', warnung: '!', info: 'i' };
  const mieter = r.mieter.filter(x => x.tage > 0);
  const nurMieter = mieter.filter(x => !x.m.vermieter);
  const sumVZ = nurMieter.reduce((s, x) => s + x.vorauszahlungen, 0);
  const sumSaldo = nurMieter.reduce((s, x) => s + x.saldo, 0);
  const sumAbgerechnet = F.r2(nurMieter.reduce((s, x) => s + x.summeGerundet, 0));
  const saldo = x => x.m.vermieter ? '–' : `<span class="${x.saldo < 0 ? 'nach' : 'gut'}">${x.saldo < 0 ? 'Nachzahlung' : x.saldo > 0 ? 'Guthaben' : ''} ${F.eur(Math.abs(x.saldo))}</span>`;
  return `
  <section class="karte">
    <h2>Prüfungen</h2>
    ${r.warnungen.length ? `<ul class="pruefungen">${r.warnungen.map(w => `<li class="${w.art}"><span class="sym">${sym[w.art]}</span>${esc(w.text)}</li>`).join('')}</ul>` : '<p class="ok">Keine Auffälligkeiten.</p>'}
  </section>
  <section class="kacheln">
    <div class="kachel"><span>Gesamtkosten</span><b>${F.eur(r.summeKosten)}</b></div>
    <div class="kachel"><span>den Mietern berechnet</span><b>${F.eur(sumAbgerechnet)}</b></div>
    <div class="kachel"><span>Vermieter / Leerstand</span><b>${F.eur(r.summeKosten - sumAbgerechnet)}</b></div>
    <div class="kachel"><span>Vorauszahlungen</span><b>${F.eur(sumVZ)}</b></div>
  </section>
  <section class="karte">
    <h2>Ergebnis je Mieter</h2>
    <div class="tabelle-scroll"><table class="tabelle">
      <thead><tr><th>Wohnung</th><th>Mieter</th><th class="r">Tage</th><th class="r">Kosten</th><th class="r">Vorauszahl.</th><th class="r">Ergebnis</th><th class="r">neue Vorauszahl./Monat</th></tr></thead>
      <tbody>${mieter.map(x => `<tr class="${x.m.vermieter ? 'leise' : ''}">
        <td>${esc(x.w.bezeichnung)}</td><td>${esc(x.name)}</td><td class="r">${x.tage}</td>
        <td class="r">${F.eur(x.summeGerundet)}</td><td class="r">${x.m.vermieter ? '–' : F.eur(x.vorauszahlungen)}</td>
        <td class="r">${saldo(x)}</td>
        <td class="r">${x.abschlagVorschlag != null && !x.m.vermieter ? inp(`m:${x.m.id}:neuerAbschlag`, x.m.neuerAbschlag, { t: 'num', cls: 'kurz r', ph: F.num2(x.abschlagVorschlag) }) : '–'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">Summe Mieter</td><td class="r">${F.eur(sumAbgerechnet)}</td><td class="r">${F.eur(sumVZ)}</td><td class="r">${F.eur(sumSaldo)}</td><td></td></tr></tfoot>
    </table></div>
    <p class="leise klein">Neue Vorauszahlung: Vorschlag = Jahreskosten hochgerechnet auf 365 Tage ÷ 12, aufgerundet. Eigener Betrag überschreibt den Vorschlag.</p>
  </section>
  <section class="karte">
    <h2>Verteilung je Kostenart</h2>
    <div class="tabelle-scroll"><table class="tabelle">
      <thead><tr><th>Kostenart</th><th>Schlüssel</th><th class="r">Betrag</th><th class="r">Mieter</th><th class="r">Vermieter / Leerstand</th></tr></thead>
      <tbody>${r.posten.filter(p => p.betrag).map(p => {
        const mAnteil = r.mieter.filter(x => !x.m.vermieter).reduce((s, x) => s + x.zeilen.find(z => z.kosten === p.k).anteil, 0);
        return `<tr><td>${esc(p.k.name)}</td><td>${esc(M.SCHLUESSEL[p.k.schluessel]?.kurz || '')}</td><td class="r">${F.eur(p.betrag)}</td><td class="r">${F.eur(mAnteil)}</td><td class="r">${F.eur(p.betrag - mAnteil)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
  </section>`;
}

function viewDruck(o, j) {
  const r = berechne(o, j);
  const kandidaten = r.mieter.filter(x => !x.m.vermieter && x.tage > 0);
  const aus = new Set(daten.ui.druckAus || []);
  const gewaehlt = kandidaten.filter(x => !aus.has(x.m.id));
  const fehler = r.warnungen.filter(w => w.art === 'fehler').length;
  return `
  <div class="nicht-drucken">
    ${fehler ? `<section class="karte warn-box"><p>Es gibt noch ${fehler} Fehler in der Abrechnung. <button data-a="nav" data-v="ergebnis">Prüfungen ansehen</button></p></section>` : ''}
    <section class="karte">
      <h2>Anschreiben ${j.jahr}</h2>
      <div class="raster">
        ${feld('Abrechnungsdatum', inp('j::abrechnungsdatum', j.abrechnungsdatum || F.todayISO(), { t: 'date', attrs: 'data-neu-change' }))}
        ${feld('Hinweistext', area('j::hinweis', j.hinweis, { rows: 4, attrs: 'data-neu-change' }), 'breit')}
      </div>
      <div class="auswahl">${kandidaten.map(x => `<label class="check"><input type="checkbox" data-druck="${x.m.id}" ${aus.has(x.m.id) ? '' : 'checked'}> ${esc(x.w.bezeichnung)} – ${esc(x.name)}</label>`).join('')}</div>
      <div class="knoepfe"><button class="primaer" data-a="drucken" ${gewaehlt.length ? '' : 'disabled'}>Drucken / als PDF speichern (${gewaehlt.length})</button></div>
      <p class="leise klein">Im Druckdialog „Als PDF speichern“ wählen, um PDF-Dateien zu erzeugen. Jede Abrechnung beginnt auf einer neuen Seite.</p>
    </section>
  </div>
  <div id="druck-bereich" class="druck-vorschau">${gewaehlt.map(x => brief(o, j, r, x)).join('')}</div>`;
}

function viewDaten() {
  return `
  <section class="karte">
    <h2>Datensicherung</h2>
    <p>Alle Daten liegen nur in diesem Browser auf diesem Gerät. Wenn Sie die Browserdaten löschen oder das Gerät wechseln, sind sie weg – sichern Sie deshalb regelmäßig.</p>
    <p class="leise">Letzte Sicherung: ${daten.ui.letzterExport ? F.deDate(daten.ui.letzterExport.slice(0, 10)) : 'noch nie'}</p>
    <div class="knoepfe">
      <button class="primaer" data-a="export">Sicherung herunterladen</button>
      <label class="knopf">Sicherung wiederherstellen<input type="file" accept="application/json,.json" data-datei="import-ersetzen" hidden></label>
      <label class="knopf">Objekte aus Datei hinzufügen<input type="file" accept="application/json,.json" data-datei="import-hinzu" hidden></label>
    </div>
    <p class="leise klein">„Wiederherstellen“ ersetzt alle Daten. „Hinzufügen“ übernimmt die Objekte aus der Datei zusätzlich.</p>
  </section>
  <section class="karte">
    <h2>Speicher</h2>
    <p id="speicher-info" class="leise">wird ermittelt …</p>
  </section>
  <section class="karte">
    <h2>App installieren</h2>
    <p class="leise">Die App funktioniert offline. Installieren: in Chrome/Edge über das Installieren-Symbol in der Adressleiste, auf dem iPhone in Safari über „Teilen → Zum Home-Bildschirm“.</p>
    <button data-a="installieren" id="install-knopf" hidden>App installieren</button>
  </section>
  <section class="karte">
    <h2>Beispiel</h2>
    <p class="leise">Fügt ein erfundenes Beispielobjekt hinzu, um die App auszuprobieren.</p>
    <button data-a="demo">Beispielobjekt hinzufügen</button>
  </section>
  <section class="karte gefahr-zone">
    <button class="gefahr" data-a="alles-loeschen">Alle Daten in diesem Browser löschen</button>
    <p class="leise klein">Nebenkosten-App Version ${APP_VERSION}</p>
  </section>`;
}

// ------------------------------------------------------------------ Werte setzen
function setzeWert(el) {
  const { o, j } = aktuell();
  const [scope, id, f, sub] = el.dataset.k.split(':');
  const t = el.dataset.t || 'text';
  const val = t === 'num' ? F.parseNum(el.value) : t === 'bool' ? el.checked : t === 'date' ? (el.value || null) : el.value;
  const mvx = () => find(j.mietverhaeltnisse, id);
  switch (scope) {
    case 'o': o[f] = val; break;
    case 'v': o.vermieter[f] = val; break;
    case 'w': find(o.wohnungen, id)[f] = val; break;
    case 'z': find(o.zaehlerarten, id)[f] = val; break;
    case 'j': j[f] = val; break;
    case 'k': {
      const k = find(j.kosten, id);
      k[f] = val;
      if (f === 'schluessel' && val === 'verbrauch' && !k.zaehlerart) k.zaehlerart = o.zaehlerarten[0]?.id || null;
      break;
    }
    case 'm': mvx()[f] = val; break;
    case 'mv': mvx().vorauszahlungen[+f] = val; break;
    case 'mz': { const m = mvx(); m.zaehler[f] ||= {}; m.zaehler[f][sub] = val; break; }
    case 'mva': {
      const m = mvx();
      const im = new Set(monateImZeitraum(m, j));
      m.vorauszahlungen = m.vorauszahlungen.map((v, i) => (im.has(i) ? val : null));
      m.vorauszahlungen.forEach((v, i) => { const e = document.querySelector(`[data-k="mv:${m.id}:${i}"]`); if (e) e.value = F.inNum(v); });
      break;
    }
    default: return;
  }
  persist();
}

// ------------------------------------------------------------------ Aktionen
function auswaehlen(oId, jId = null) { daten.ui.objektId = oId; daten.ui.jahrId = jId; }
function ansicht(v) { daten.ui.view = v; persist(); render(); window.scrollTo(0, 0); }

const AKTIONEN = {
  nav: d => ansicht(d.v),
  'objekt-neu': () => {
    const { o: vorlage } = aktuell();
    const o = M.neuesObjekt(vorlage);
    o.name = 'Neues Objekt';
    o.wohnungen.push(M.neueWohnung(1));
    daten.objekte.push(o);
    auswaehlen(o.id);
    ansicht('objekt');
  },
  demo: () => {
    const o = M.demoObjekt();
    daten.objekte.push(o);
    auswaehlen(o.id, o.jahre[0].id);
    ansicht('ergebnis');
  },
  'objekt-oeffnen': d => { auswaehlen(d.o); ansicht('objekt'); },
  'jahr-waehlen': d => { auswaehlen(d.o, d.j); ansicht('ergebnis'); },
  'jahr-neu-form': d => { auswaehlen(d.o); daten.ui.neuJahr = d.o; ansicht('start'); },
  'jahr-neu-abbrechen': () => { daten.ui.neuJahr = null; render(); },
  'jahr-anlegen': d => {
    const o = find(daten.objekte, d.o);
    const jahr = parseInt(document.getElementById('neu-jahr').value, 10);
    if (!(jahr >= 1990 && jahr <= 2100)) return alert('Bitte ein gültiges Jahr eingeben.');
    if (o.jahre.some(x => x.jahr === jahr)) return alert(`Das Abrechnungsjahr ${jahr} gibt es bereits.`);
    const vId = document.getElementById('neu-vorlage')?.value;
    const vorjahr = vId ? find(o.jahre, vId) : null;
    const j = vorjahr ? M.jahrAusVorjahr(o, vorjahr, jahr) : M.neuesJahr(o, jahr);
    o.jahre.push(j);
    daten.ui.neuJahr = null;
    auswaehlen(o.id, j.id);
    ansicht('mieter');
  },
  'jahr-loeschen': () => {
    const { o, j } = aktuell();
    if (!confirm(`Abrechnungsjahr ${j.jahr} mit allen Mietern, Zählerständen und Kosten löschen?`)) return;
    o.jahre = o.jahre.filter(x => x !== j);
    daten.ui.jahrId = null;
    ansicht('start');
  },
  'objekt-loeschen': () => {
    const { o } = aktuell();
    if (!confirm(`Objekt „${o.name || o.strasse}“ mit allen Abrechnungsjahren endgültig löschen?`)) return;
    daten.objekte = daten.objekte.filter(x => x !== o);
    auswaehlen(null);
    ansicht('start');
  },
  'wohnung-neu': () => { const { o } = aktuell(); o.wohnungen.push(M.neueWohnung(o.wohnungen.length + 1)); persist(); render(); },
  'wohnung-loeschen': d => {
    const { o } = aktuell();
    const w = find(o.wohnungen, d.id);
    const n = o.jahre.reduce((s, j) => s + j.mietverhaeltnisse.filter(m => m.wohnungId === w.id).length, 0);
    if (!confirm(`${w.bezeichnung} entfernen?${n ? ` Dabei werden ${n} Mieter-Einträge in allen Jahren gelöscht.` : ''}`)) return;
    o.wohnungen = o.wohnungen.filter(x => x !== w);
    for (const j of o.jahre) j.mietverhaeltnisse = j.mietverhaeltnisse.filter(m => m.wohnungId !== w.id);
    persist(); render();
  },
  'zaehlerart-neu': () => { const { o } = aktuell(); o.zaehlerarten.push({ id: F.uid(), name: 'Neuer Zähler', einheit: 'm³' }); persist(); render(); },
  'zaehlerart-loeschen': d => {
    const { o } = aktuell();
    if (o.jahre.some(j => j.kosten.some(k => k.schluessel === 'verbrauch' && k.zaehlerart === d.id && k.betrag)))
      return alert('Diese Zählerart wird noch für Kosten verwendet. Bitte zuerst den Umlageschlüssel der Kosten ändern.');
    if (!confirm('Zählerart und alle zugehörigen Zählerstände entfernen?')) return;
    o.zaehlerarten = o.zaehlerarten.filter(z => z.id !== d.id);
    for (const j of o.jahre) for (const m of j.mietverhaeltnisse) delete m.zaehler[d.id];
    persist(); render();
  },
  'logo-entfernen': () => { aktuell().o.vermieter.logo = null; persist(); render(); },
  'mv-neu': d => {
    const { o, j } = aktuell();
    const vor = j.mietverhaeltnisse.filter(m => m.wohnungId === d.w).sort((a, b) => (a.bis < b.bis ? -1 : 1)).at(-1) || null;
    const m = M.neuesMietverhaeltnis(d.w, j, vor);
    if (vor?.bis && vor.bis < j.bis) m.von = plusTage(vor.bis, 1);
    for (const z of o.zaehlerarten) m.zaehler[z.id] ||= { alt: null, neu: null };
    j.mietverhaeltnisse.push(m);
    persist(); render();
  },
  'mv-loeschen': d => {
    const { j } = aktuell();
    const m = find(j.mietverhaeltnisse, d.id);
    if (!confirm(`${m.mieter || 'Eintrag'} entfernen?`)) return;
    j.mietverhaeltnisse = j.mietverhaeltnisse.filter(x => x !== m);
    persist(); render();
  },
  'kosten-neu': () => {
    const { j } = aktuell();
    j.kosten.push({ id: F.uid(), name: 'Neue Kostenart', betrag: null, schluessel: 'flaeche', zaehlerart: null, notiz: '' });
    persist(); render();
  },
  'kosten-loeschen': d => {
    const { j } = aktuell();
    const k = find(j.kosten, d.id);
    if (k.betrag && !confirm(`„${k.name}“ mit ${F.eur(k.betrag)} entfernen?`)) return;
    j.kosten = j.kosten.filter(x => x !== k);
    persist(); render();
  },
  drucken: () => window.print(),
  export: () => { S.exportDatei(daten); daten.ui.letzterExport = new Date().toISOString(); persist(true); render(); },
  'alles-loeschen': () => {
    if (!confirm('Wirklich ALLE Objekte und Abrechnungen in diesem Browser löschen?')) return;
    if (!confirm('Letzte Rückfrage: Haben Sie eine Sicherung? Die Daten sind danach unwiderruflich weg.')) return;
    daten = M.leereDaten();
    persist(true);
    ansicht('start');
  },
  installieren: async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; render(); },
  update: () => { wartenderSW?.postMessage('skipWaiting'); },
};

async function logoLaden(file) {
  const { o } = aktuell();
  if (!file?.type.startsWith('image/')) return alert('Bitte eine Bilddatei wählen.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 200;
    const f = Math.min(1, 800 / w0, 300 / h0);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * f));
    c.height = Math.max(1, Math.round(h0 * f));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const data = file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png');
    o.vermieter.logo = data;
    persist(true);
    render();
  } catch {
    alert('Das Bild konnte nicht gelesen werden.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dateiImport(art, file) {
  try {
    const neu = await S.importDatei(file);
    if (art === 'import-ersetzen') {
      if (daten.objekte.length && !confirm(`Alle aktuellen Daten durch die Sicherung ersetzen (${neu.objekte.length} Objekte)?`)) return;
      neu.ui = { ...M.leereDaten().ui, letzterExport: daten.ui.letzterExport };
      daten = neu;
    } else {
      const ids = new Set(daten.objekte.map(o => o.id));
      for (const o of neu.objekte) { if (ids.has(o.id)) o.id = F.uid(); daten.objekte.push(o); }
    }
    persist(true);
    ansicht('start');
  } catch (e) {
    alert('Import fehlgeschlagen: ' + e.message);
  }
}

// ------------------------------------------------------------------ Ereignisse
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset?.k) return;
  setzeWert(el);
  aktualisiereAusgaben();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'wahl-objekt') { auswaehlen(el.value); daten.ui.neuJahr = null; persist(); return render(); }
  if (el.id === 'wahl-jahr') { daten.ui.jahrId = el.value; persist(); return render(); }
  if (el.dataset?.druck) {
    const aus = new Set(daten.ui.druckAus || []);
    el.checked ? aus.delete(el.dataset.druck) : aus.add(el.dataset.druck);
    daten.ui.druckAus = [...aus];
    persist(); return render();
  }
  if (el.dataset?.datei) {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    return el.dataset.datei === 'logo' ? logoLaden(file) : dateiImport(el.dataset.datei, file);
  }
  if (!el.dataset?.k) return;
  setzeWert(el);
  if ('neu' in el.dataset || 'neuChange' in el.dataset) render();
  else aktualisiereAusgaben();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const f = AKTIONEN[b.dataset.a];
  if (f) { e.preventDefault(); f(b.dataset); }
});

// ------------------------------------------------------------------ Speicher-Info (Daten-Ansicht)
const beobachter = new MutationObserver(async () => {
  const el = document.getElementById('speicher-info');
  if (!el || el.dataset.fertig) return;
  el.dataset.fertig = '1';
  const s = await S.speicherStatus();
  el.textContent = `${s.dauerhaft ? 'Dauerhafter Speicher ist aktiv – der Browser löscht die Daten nicht von selbst.' : 'Der Browser hat keinen dauerhaften Speicher zugesagt – bitte regelmäßig sichern.'}${s.belegt != null ? ` Belegt: ${(s.belegt / 1024).toFixed(1)} KB.` : ''}`;
  const ik = document.getElementById('install-knopf');
  if (ik) ik.hidden = !installEvent;
});
beobachter.observe(main, { childList: true });

// ------------------------------------------------------------------ PWA: Installation & Updates
let installEvent = null;
let wartenderSW = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; });

function zeigeUpdate(sw) {
  wartenderSW = sw;
  const b = document.getElementById('update');
  b.hidden = false;
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) zeigeUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) zeigeUpdate(nw);
      });
    });
  }).catch(() => { /* offline-Funktion nicht verfügbar */ });
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen || !wartenderSW) return;
    neuGeladen = true;
    location.reload();
  });
}

// ------------------------------------------------------------------ Start
if (S.letzterFehler()) statusEl.textContent = 'Gespeicherte Daten konnten nicht gelesen werden!';
S.dauerhaftAnfordern();
render();
