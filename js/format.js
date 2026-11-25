// Nebensache – Copyright (C) 2026 Wolfgang Stubig
// SPDX-License-Identifier: GPL-3.0-or-later
// Formatierung und Parsing (deutsch), Datumsrechnung in UTC-Tagen.

const nf2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfMax3 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** "1.234,5" / "1234.5" / "12," -> Zahl; leer -> null */
export function parseNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s|€/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const r2 = x => Math.round((x + Math.sign(x) * Number.EPSILON) * 100) / 100;
export const eur = x => (x == null ? '' : nf2.format(r2(x)) + ' €');
export const num2 = x => (x == null ? '' : nf2.format(x));
export const num = x => (x == null ? '' : nfMax3.format(x));
/** Zahl für ein Eingabefeld (Komma, ohne Tausenderpunkte) */
export const inNum = x => (x == null || x === '' ? '' : String(x).replace('.', ','));

export function dayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
}
export const isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
/** Anzahl Tage inkl. beider Enden */
export const tage = (von, bis) => dayNum(bis) - dayNum(von) + 1;
export function overlap(aVon, aBis, bVon, bBis) {
  if (![aVon, aBis, bVon, bBis].every(isISO)) return 0;
  const s = Math.max(dayNum(aVon), dayNum(bVon));
  const e = Math.min(dayNum(aBis), dayNum(bBis));
  return e >= s ? e - s + 1 : 0;
}
export function deDate(iso) {
  if (!isISO(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
