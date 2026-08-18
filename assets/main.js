/**
 * Shared front-end utilities for the Hajj coordination site.
 * Used by every public page (index/schedule/day/prayer-times) and by the editor.
 * No page-specific logic lives here — keep this file generic and dependency-free.
 */

/**
 * Minimal RFC4180-ish CSV parser with quote support.
 * Kept for backward compatibility with any legacy CSV-based content;
 * the current build reads content from Firestore instead (see data-store.js).
 */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  text = text.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const filtered = rows.filter(r => r.some(cell => cell.trim() !== ''));
  if (!filtered.length) return [];
  const headers = filtered[0].map(h => h.trim());
  return filtered.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (r[idx] ?? '').trim());
    return obj;
  });
}

/** Parses "### Heading\ncontent" blocks. Legacy helper, kept for compatibility. */
function parseSections(text) {
  const out = {};
  const parts = text.replace(/\r\n/g, '\n').split(/\n(?=### )/);
  parts.forEach(p => {
    const m = p.match(/^###\s*(.+?)\n([\s\S]*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  });
  return out;
}

async function loadText(path) {
  const res = await fetch(path + '?v=' + Date.now());
  if (!res.ok) throw new Error('Failed to load ' + path);
  return res.text();
}
async function loadCSV(path) { return parseCSV(await loadText(path)); }

/**
 * Tiny DOM-building helper: el('div', {class:'foo'}, ['text', childNode]).
 * Supports a special `style` string attr and an `html` attr for raw innerHTML (icons only).
 */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function showError(container, msg) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'empty-state' },
    'تعذّر تحميل المحتوى. تأكد من نشر نسخة من لوحة التحكم أولًا.' + (msg ? ' (' + msg + ')' : '')));
}

/* =========================================================
   Day color system
   Each day has a color name chosen from DAY_COLOR_PRESETS,
   OR a custom hex value (starts with "#") picked via a color input.
   dayColor() resolves either form to a usable CSS color.
   ========================================================= */
const DAY_COLOR_PRESETS = [
  { id: 'navy',   label: 'كحلي',        hex: '#3E5C6E' },
  { id: 'teal',   label: 'أزرق مخضر',   hex: '#3E948A' },
  { id: 'olive',  label: 'أخضر زيتوني', hex: '#6E8C4B' },
  { id: 'brown',  label: 'بني',         hex: '#8A7048' },
  { id: 'maroon', label: 'عنّابي',      hex: '#8B4A55' },
  { id: 'purple', label: 'بنفسجي',      hex: '#6B4E8C' },
  { id: 'blue',   label: 'أزرق',        hex: '#2E6BA8' },
  { id: 'green',  label: 'أخضر',        hex: '#3E8C5A' },
];
const DAY_COLOR_MAP = Object.fromEntries(DAY_COLOR_PRESETS.map(c => [c.id, c.hex]));

/**
 * Resolves a stored `color` value to a CSS color.
 * Accepts: a preset id ("navy"), a raw hex string ("#123abc"), or legacy
 * ids from the previous build (tarwiyah/arafah/nahr/tashreeq1/tashreeq2).
 */
function dayColor(color) {
  if (!color) return '#8C6530';
  if (color.startsWith('#')) return color;
  if (DAY_COLOR_MAP[color]) return DAY_COLOR_MAP[color];
  const LEGACY_MAP = {
    tarwiyah: '#3E5C6E', arafah: '#3E948A', nahr: '#6E8C4B',
    tashreeq1: '#8A7048', tashreeq2: '#8B4A55',
  };
  return LEGACY_MAP[color] || '#8C6530';
}

/* =========================================================
   Hijri / weekday auto-fill helpers
   Uses the built-in Intl Islamic calendar (Umm al-Qura) — no external library.
   ========================================================= */

/** Converts a "YYYY-MM-DD" Gregorian date string to a Hijri date string like "١٤٤٧/١٢/٩". */
function hijriFromGregorian(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d)) return '';
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(d);
    const get = t => parts.find(p => p.type === t)?.value || '';
    return `${get('year')}/${get('month')}/${get('day')}`;
  } catch {
    return '';
  }
}

/** Returns the Arabic weekday label ("يوم الثلاثاء") for a "YYYY-MM-DD" date string. */
function weekdayFromGregorian(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d)) return '';
  const name = new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(d);
  return 'يوم ' + name;
}

/** Formats a "YYYY-MM-DD" date string as "٢٠٢٦/٥/٢٦" using Arabic-Indic digits. */
function gregorianDisplay(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d)) return '';
  const parts = new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}

/* =========================================================
   Icon library — small inline SVGs, no external assets or trademarked glyphs.
   ========================================================= */
const ICON_PRESETS = [
  { id: 'move',   label: 'تحرك / باص' },
  { id: 'gather', label: 'تجمع' },
  { id: 'prayer', label: 'صلاة' },
  { id: 'meal',   label: 'وجبة' },
  { id: 'stay',   label: 'مبيت' },
  { id: 'arrive', label: 'وصول' },
  { id: 'clock',  label: 'عام' },
];
const ICONS = {
  move: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="7.5" cy="19" r="1.5" fill="currentColor"/><circle cx="16.5" cy="19" r="1.5" fill="currentColor"/><path d="M3 12h18"/></svg>',
  gather: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>',
  prayer: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v6M12 9c-3 0-5 2.5-5 6v3h10v-3c0-3.5-2-6-5-6Z"/><path d="M4 21h16"/></svg>',
  meal: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v9M11 3v7a2 2 0 0 1-2 2M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v9"/></svg>',
  stay: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v7M3 18h18M3 18v2M21 18v2M13 9h6a2 2 0 0 1 2 2v3"/></svg>',
  arrive: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M4 21h16"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><circle cx="12" cy="10" r="3"/><path d="M12 21s7-6.5 7-11a7 7 0 0 0-14 0c0 4.5 7 11 7 11Z"/></svg>',
  phone: '<svg class="i ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .8 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.5a2 2 0 0 1 2.1-.4c1 .4 2 .7 3 .8a2 2 0 0 1 1.4 2Z"/></svg>',
};
function icon(name) { return ICONS[name] || ICONS.clock; }
