// Lokale Speicherung im Browser (localStorage) + Export/Import als JSON-Datei.
import { leereDaten, normalisiere } from './model.js';

const KEY = 'nebenkosten.daten.v1';
let speicherFehler = null;

export function laden() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalisiere(JSON.parse(raw)) : leereDaten();
  } catch (e) {
    speicherFehler = e;
    return leereDaten();
  }
}

export function speichern(daten) {
  try {
    localStorage.setItem(KEY, JSON.stringify(daten));
    speicherFehler = null;
    return true;
  } catch (e) {
    speicherFehler = e;
    return false;
  }
}

export const letzterFehler = () => speicherFehler;

export async function dauerhaftAnfordern() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* nicht unterstützt */ }
  return false;
}

export async function speicherStatus() {
  const s = { dauerhaft: false, belegt: null };
  try { s.dauerhaft = !!(await navigator.storage?.persisted?.()); } catch { /* */ }
  try { s.belegt = new Blob([localStorage.getItem(KEY) || '']).size; } catch { /* */ }
  return s;
}

export function exportDatei(daten) {
  const { ui, ...rest } = daten;
  const blob = new Blob([JSON.stringify({ ...rest, exportiert: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.download = `nebenkosten-sicherung-${d.toISOString().slice(0, 10)}.json`;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function importDatei(file) {
  const text = await file.text();
  return normalisiere(JSON.parse(text));
}
