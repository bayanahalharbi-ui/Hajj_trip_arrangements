/* =========================================================
   منطق الموقع — لا حاجة لتعديل هذا الملف
   التعديل يكون داخل مجلد data/ فقط
   ========================================================= */

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
  if (!res.ok) throw new Error('تعذّر تحميل ' + path);
  return res.text();
}
async function loadCSV(path) { return parseCSV(await loadText(path)); }

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
    'تعذّر تحميل المحتوى. تأكد أن ملفات مجلد data لم تُحذف وأن تنسيقها صحيح.' + (msg ? ' (' + msg + ')' : '')));
}

/* ---- الألوان المرتبطة بكل يوم ---- */
const DAY_COLORS = {
  tarwiyah:  'var(--d-tarwiyah)',
  arafah:    'var(--d-arafah)',
  nahr:      'var(--d-nahr)',
  tashreeq1: 'var(--d-tashreeq1)',
  tashreeq2: 'var(--d-tashreeq2)',
};
function dayColor(id) { return DAY_COLORS[id] || 'var(--gold-dark)'; }

/* ---- مكتبة أيقونات SVG بسيطة (بدون أي شعارات أو رموز محمية) ---- */
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
