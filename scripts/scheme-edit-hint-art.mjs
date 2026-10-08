#!/usr/bin/env node
/**
 * Рисунки демо-каталога фото-подсказок стенда `/scheme-edit` — такт 87 (решение 3 оркестратора 2026-10-08). Оснастка стенда,
 * не продукт: 23 файла SVG в `public/scheme-edit/hints/` — 16 рисунков «Транспорта», 6 «Документов» и картинка своей
 * загрузки. Общие палитра, штрих, «видоискатель» (четыре угловые скобки вокруг части, которую снимают) и одна трёхмерная
 * модель автомобиля на все восемь внешних ракурсов — перспектива и пропорции совпадают, правые ракурсы — зеркало левых.
 *
 * Правила рисунка: кадр 320 × 200 (16:10), подложка первой; только нейтральные серые — без брендовых цветов; надписи —
 * серыми полосами, без букв и цифр; марок, номеров и людей нет; главное — в пределах x 36…284 (кадр режется и до 4:3).
 * Источники и подписи — `public/scheme-edit/hints/CREDITS.md`, справочник — `app/stands/scheme-edit/hints.ts`.
 *
 * Запуск: node scripts/scheme-edit-hint-art.mjs [папка]   — по умолчанию public/scheme-edit/hints
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '../public/scheme-edit/hints');
mkdirSync(OUT, { recursive: true });

const C = { bg: '#eef0f3', line: '#6b7480', dark: '#4a525c', light: '#f8f9fa', glass: '#dce1e7', mid: '#c5ccd4', focus: '#2f3640' };
const files = {};

// ---------- примитивы вывода 2D ----------
const n = (v) => { const r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r); };
const st = (fill, sw = 3, stroke = C.line) => `fill="${fill || 'none'}"` + (sw ? ` stroke="${stroke}" stroke-width="${sw}"` : '');
const P = (d, fill, sw = 3, stroke = C.line) => `<path d="${d}" ${st(fill, sw, stroke)}/>`;
const rect = (x, y, w, h, rx, fill, sw = 3, stroke = C.line) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ''} ${st(fill, sw, stroke)}/>`;
const circ = (cx, cy, r, fill, sw = 3, stroke = C.line) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${st(fill, sw, stroke)}/>`;
const ell = (cx, cy, rx, ry, fill, sw = 3, stroke = C.line) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${st(fill, sw, stroke)}/>`;
const ln = (pts, sw = 3, stroke = C.line) => P('M' + pts.map((p) => n(p[0]) + ' ' + n(p[1])).join('L'), null, sw, stroke);
// отдельные отрезки [[a,b],[c,d],...] одним путём
const segs = (pairs, sw = 2, stroke = C.line) => P(pairs.map(([a, b]) => `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`).join(''), null, sw, stroke);
const pg = (pts, fill, sw = 3, stroke = C.line) => P('M' + pts.map((p) => n(p[0]) + ' ' + n(p[1])).join('L') + 'Z', fill, sw, stroke);
// вместо текста — скруглённая серая полоса
const bar = (x, y, w, h = 5, rx = h / 2) => rect(x, y, w, h, rx, C.mid, 0);
// видоискатель: четыре угловые скобки, плечо 14
const vfD = (x0, y0, x1, y1, a = 14) => (
  `M${n(x0)} ${n(y0 + a)}V${n(y0)}H${n(x0 + a)}M${n(x1 - a)} ${n(y0)}H${n(x1)}V${n(y0 + a)}` +
  `M${n(x1)} ${n(y1 - a)}V${n(y1)}H${n(x1 - a)}M${n(x0 + a)} ${n(y1)}H${n(x0)}V${n(y1 - a)}`);
const vf = (...a) => P(vfD(...a), null, 7, C.bg) + P(vfD(...a), null, 3, C.focus);

function svg(name, body) {
  files[name] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">` +
    `<rect width="320" height="200" fill="${C.bg}"/><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
}

// ---------- команды пути: ['M',p] ['L',p] ['Q',c,p] ['C',c1,c2,p] ['Z'] ----------
const nn = (v) => n(v).replace(/^(-?)0./, '$1.');
const dOf = (cmds) => cmds.map(([c, ...ps]) => c + ps.flat().map(nn).reduce((a, t, i) => a + (i && t[0] !== '-' ? ' ' : '') + t, '')).join('');
const mapC = (cmds, f) => cmds.map(([c, ...ps]) => [c, ...ps.map(f)]);
// отображение через изогнутую (квадратичную) поверхность: прямые отрезки становятся точными квадратичными кривыми
function mapQ(cmds, f) {
  const out = []; let cur, start;
  for (const [c, ...ps] of cmds) {
    if (c === 'L') {
      const a = cur, b = ps[0], A = f(a), B = f(b), m = f([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      out.push(['Q', A.map((v, i) => 2 * m[i] - (v + B[i]) / 2), B]);
    } else if (c === 'Z' && (cur[0] !== start[0] || cur[1] !== start[1])) {
      const A = f(cur), B = f(start), m = f([(cur[0] + start[0]) / 2, (cur[1] + start[1]) / 2]);
      out.push(['Q', A.map((v, i) => 2 * m[i] - (v + B[i]) / 2), B], ['Z']);
    } else out.push([c, ...ps.map(f)]);
    if (c === 'M') start = ps[0];
    cur = c === 'Z' ? start : ps[ps.length - 1];
  }
  return out;
}
function arcC(cx, cy, rx, ry, a0, a1) { // градусы, кубические отрезки; текущая точка — в a0
  const out = [], k0 = Math.PI / 180, ns = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
  for (let i = 0; i < ns; i++) {
    const a = (a0 + (a1 - a0) * i / ns) * k0, b = (a0 + (a1 - a0) * (i + 1) / ns) * k0, k = 4 / 3 * Math.tan((b - a) / 4);
    const p0 = [cx + rx * Math.cos(a), cy + ry * Math.sin(a)], p3 = [cx + rx * Math.cos(b), cy + ry * Math.sin(b)];
    out.push(['C', [p0[0] - k * rx * Math.sin(a), p0[1] + k * ry * Math.cos(a)], [p3[0] + k * rx * Math.sin(b), p3[1] - k * ry * Math.cos(b)], p3]);
  }
  return out;
}
const ellC = (cx, cy, rx, ry) => [['M', [cx + rx, cy]], ...arcC(cx, cy, rx, ry, 0, 360), ['Z']];
const polyC = (pts, close = true) => [['M', pts[0]], ...pts.slice(1).map((p) => ['L', p]), ...(close ? [['Z']] : [])];
function rr2C(x0, y0, x1, y1, rb, rt) { // у кромок y0 и y1 — свои радиусы
  return rr2raw(x0, y0, x1, y1, rb, rt).filter((c, i, a) => c[0] !== 'L' || Math.hypot(c[1][0] - a[i - 1].at(-1)[0], c[1][1] - a[i - 1].at(-1)[1]) > 1e-6);
}
function rr2raw(x0, y0, x1, y1, rb, rt) {
  return [['M', [x0 + rb, y0]], ['L', [x1 - rb, y0]], ...arcC(x1 - rb, y0 + rb, rb, rb, -90, 0), ['L', [x1, y1 - rt]],
    ...arcC(x1 - rt, y1 - rt, rt, rt, 0, 90), ['L', [x0 + rt, y1]], ...arcC(x0 + rt, y1 - rt, rt, rt, 90, 180),
    ['L', [x0, y0 + rb]], ...arcC(x0 + rb, y0 + rb, rb, rb, 180, 270), ['Z']];
}
// список команд — в точки (для точных габаритов)
function ptsOf(cmds) {
  const out = []; let cur, start;
  for (const [c, ...ps] of cmds) {
    if (c === 'Q' || c === 'C') {
      const q = [cur, ...ps];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, u = 1 - t;
        const w = q.length === 3 ? [u * u, 2 * u * t, t * t] : [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
        out.push([0, 1].map((j) => w.reduce((s, wi, k) => s + wi * q[k][j], 0)));
      }
    } else if (c !== 'Z') out.push(ps[0]);
    if (c === 'M') start = ps[0];
    cur = c === 'Z' ? start : ps[ps.length - 1];
  }
  return out;
}
const bbox = (pts) => pts.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])],
  [Infinity, Infinity, -Infinity, -Infinity]);
function hull(pts) { // монотонная цепь
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of s) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of s.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return polyC(lo.slice(0, -1).concat(up.slice(0, -1)));
}

// ---------- 3D ----------
const V = {
  sub: (a, b) => a.map((v, i) => v - b[i]), add: (a, b) => a.map((v, i) => v + b[i]), mul: (a, k) => a.map((v) => v * k),
  dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  unit: (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); },
};
function camera(dir, dist, target) {
  const eye = V.add(target, V.mul(V.unit(dir), dist));
  const f = V.unit(V.sub(target, eye)), r = V.unit(V.cross(f, [0, 0, 1])), u = V.cross(r, f);
  return { eye, p: (q) => { const d = V.sub(q, eye), z = V.dot(d, f); return [V.dot(d, r) / z, -V.dot(d, u) / z]; } };
}
const newell = (pts) => pts.reduce((nv, p, i) => { const q = pts[(i + 1) % pts.length];
  return V.add(nv, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]); }, [0, 0, 0]);
const centroid = (pts) => V.mul(pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / pts.length);

function emit(items) {
  const key = (it) => st(it.fill, it.sw, it.stroke); let out = '';
  for (let i = 0; i < items.length;) {
    let j = i; while (j + 1 < items.length && key(items[j + 1]) === key(items[i])) j++;
    out += j === i || !items[i].fill ? P(items.slice(i, j + 1).map((it) => dOf(it.c)).join(''), items[i].fill, items[i].sw, items[i].stroke)
      : `<g ${key(items[i])}>` + items.slice(i, j + 1).map((it) => `<path d="${dOf(it.c)}"/>`).join('') + '</g>';
    i = j + 1;
  }
  return out;
}
// вписать проекции в коробку: тело svg и габариты помеченных частей
function fit(items, box) {
  const [x0, y0, x1, y1] = bbox(items.flatMap((it) => ptsOf(it.c)));
  const s = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
  const T = (p) => [box.cx + s * (p[0] - (x0 + x1) / 2), box.cy + s * (p[1] - (y0 + y1) / 2)];
  const out = items.map((it) => ({ ...it, c: mapC(it.c, T) }));
  return {
    body: emit(out),
    box: (tags) => bbox(out.filter((it) => !tags || tags.some((t) => (it.tag || '') === t)).flatMap((it) => ptsOf(it.c))),
  };
}

// ---------- модель автомобиля: дециметры, x — вперёд, y — влево от машины, z — вверх ----------
// передняя и задняя грани чуть наклонены и закруглены в плане
const xF = (v) => 21.6 - 0.12 * (v - 2.4), xR = (v) => -21.8 + 0.1 * (v - 2.8), cB = 1.2 / 81;
const mFront = ([w, v]) => [xF(v) - cB * w * w, w, v];
const mRear = ([w, v]) => [xR(v) + cB * w * w, w, v];
const mSide = (s, y = 9) => ([x, z]) => [x, y * s, z];
const mGlass = (s) => ([x, z]) => [x, s * (8.4 - 0.36 * (z - 9)), z]; // боковина остекления с завалом внутрь

// боковина ниже линии окон, арки колёс вырезаны
const SIDE = [['M', [19.8, 7.4]], ['L', [20.26, 3.6]], ['Q', [20.4, 2.4], [19.2, 2.4]], ['L', [17.54, 2.49]],
  ...arcC(13.5, 3.2, 4.1, 4.1, -10, 190), ['L', [9.2, 2.4]], ['L', [-9.2, 2.4]], ['L', [-9.46, 2.49]],
  ...arcC(-13.5, 3.2, 4.1, 4.1, -10, 190), ['L', [-19.6, 2.8]], ['Q', [-20.6, 2.8], [-20.5, 3.8]],
  ['L', [-19.95, 9.3]], ['L', [-17.5, 9.5]], ['L', [8, 8.8]], ['Q', [14, 8.6], [19.8, 7.4]], ['Z']];
const SIDE_D = [ // линии дверей, ручки, края фар и фонарей
  [polyC([[8, 8.8], [8.7, 2.5]], false)], [polyC([[-6.6, 9.2], [-6.6, 2.4]], false)], [polyC([[-16.6, 9.45], [-15.4, 6.85]], false)],
  [polyC([[-5.9, 8.25], [-4.1, 8.25]], false), null, 3], [polyC([[-15.0, 8.45], [-13.2, 8.45]], false), null, 3],
  [polyC([[19.93, 6.35], [17.8, 6.7], [17.9, 7.25], [19.84, 7.05]]), C.glass],
  [polyC([[-19.99, 8.85], [-17.9, 9.05], [-18.1, 7.9], [-20.13, 7.5]]), C.mid],
];
const WIN = [polyC([[6.0, 9.25], [-1.6, 13.45], [-6.0, 13.75], [-6.0, 9.4]]), polyC([[-7.2, 9.45], [-7.2, 13.77], [-11.6, 13.48], [-15.9, 9.6]])];
const FRONT = rr2C(-9, 2.4, 9, 7.4, 1.2, 0.25);
const FRONT_D = [
  ...[1, -1].map((s) => [polyC([[3.8 * s, 6.05], [8.75 * s, 6.35], [8.75 * s, 7.05], [4 * s, 6.95]]), C.glass]),
  [rr2C(-3.3, 4.6, 3.3, 6.6, 0.5, 0.5), C.mid], [polyC([[-2.6, 5.25], [2.6, 5.25]], false)], [polyC([[-2.6, 5.95], [2.6, 5.95]], false)],
  [polyC([[-8.7, 4.2], [8.7, 4.2]], false), null, 1], [rr2C(-5.6, 2.9, 5.6, 3.7, 0.4, 0.4), C.mid, 1], // линия бампера, воздухозаборник
];
const REAR = rr2C(-9, 2.8, 9, 9.3, 1.0, 0.25);
const REAR_D = [
  ...[1, -1].map((s) => [polyC([[4.5 * s, 7.6], [8.85 * s, 7.5], [8.85 * s, 8.85], [4.5 * s, 8.95]]), C.mid]),
  [polyC([[-4.5, 7.6], [-4.5, 6.0], [4.5, 6.0], [4.5, 7.6]], false), null, 1],
  [rr2C(-2.5, 6.4, 2.5, 7.5, 0.25, 0.25), C.light], [polyC([[-8.7, 5.2], [8.7, 5.2]], false), null, 1],
  [rr2C(-5, 3.2, 5, 3.9, 0.35, 0.35), C.mid, 1],
];
const TOP = [['M', [19.8, -9, 7.4]], ['Q', [22.2, 0, 7.4], [19.8, 9, 7.4]], ['Q', [14, 9, 8.6], [8, 9, 8.8]], ['L', [-17.5, 9, 9.5]],
  ['L', [-19.95, 9, 9.3]], ['Q', [-22.35, 0, 9.3], [-19.95, -9, 9.3]], ['L', [-17.5, -9, 9.5]], ['L', [8, -9, 8.8]],
  ['Q', [14, -9, 8.6], [19.8, -9, 7.4]], ['Z']];
const GH = (() => {
  const WB = (s) => [8, 8.4 * s, 8.8], RF = (s) => [-1.5, 6.6 * s, 14], RM = (s) => [-6.75, 6.6 * s, 14.35],
    RR = (s) => [-12, 6.6 * s, 14], BB = (s) => [-17.5, 8.4 * s, 9.5];
  return { wind: [WB(1), WB(-1), RF(-1), RF(1)], roof: [RF(1), RF(-1), RM(-1), RR(-1), RR(1), RM(1)], back: [RR(1), RR(-1), BB(-1), BB(1)],
    sideL: [WB(1), RF(1), RM(1), RR(1), BB(1)], sideR: [WB(-1), BB(-1), RR(-1), RM(-1), RF(-1)] };
})();
const GHC = centroid(Object.values(GH).flat());

function carItems(dir, dist = 110) {
  const cam = camera(dir, dist, [0, 0, 6.5]), E = cam.eye, items = [];
  const add = (c3, fill, sw = 3, tag = '') => items.push({ c: mapC(c3, cam.p), fill, sw, stroke: C.line, tag });
  const add2 = (c2, fill, sw, stroke = C.line, tag = '') => items.push({ c: c2, fill, sw, stroke, tag });
  const seen = (pts) => {
    let nv = newell(pts); const c = centroid(pts);
    if (V.dot(nv, V.sub(c, GHC)) < 0) nv = V.mul(nv, -1);
    return V.dot(nv, V.sub(E, c)) > 0;
  };
  const near = (s) => E[1] * s > 9;
  const mirror = (s) => { // ножка, затем корпус
    for (const [xs, ys, zs] of [[[6.7, 7.6], [7.9, 9.6], [9.1, 9.6]], [[6.2, 7.9], [9.4, 10.6], [9.0, 10.3]]]) {
      const q = []; for (const x of xs) for (const y of ys) for (const z of zs) q.push(cam.p([x, y * s, z]));
      add2(hull(q), C.light, 2, C.line, 'mirror');
    }
  };
  const wheel = (x, s) => {
    const q = [];
    for (const y of [6.6, 8.8]) for (let i = 0; i < 18; i++) { const a = i / 18 * 2 * Math.PI; q.push(cam.p([x + 3.2 * Math.cos(a), y * s, 3.2 + 3.2 * Math.sin(a)])); }
    const tag = 'w' + (x > 0 ? 'f' : 'r');
    add2(hull(q), C.dark, 2, C.dark, tag);
    if (!near(s)) return;
    const m = mSide(s, 8.8);
    add(mapC(ellC(x, 3.2, 3.2, 3.2), m), C.dark, 2, tag); items.at(-1).stroke = C.dark;
    add(mapC(ellC(x, 3.2, 2.1, 2.1), m), C.mid, 2, tag);
    for (let k = 0; k < 5; k++) {
      const a = (90 + 72 * k) * Math.PI / 180;
      add(mapC(polyC([[x + 0.75 * Math.cos(a), 3.2 + 0.75 * Math.sin(a)], [x + 1.95 * Math.cos(a), 3.2 + 1.95 * Math.sin(a)]], false), m), null, 2, tag);
    }
    add(mapC(polyC([0, 1, 2, 3, 4, 5].map((k) => [x + 0.6 * Math.cos(k * Math.PI / 3), 3.2 + 0.6 * Math.sin(k * Math.PI / 3)])), m), C.line, 0, tag);
  };
  const d2 = (p) => V.dot(V.sub(p, E), V.sub(p, E));
  const W = [[13.5, 1], [-13.5, 1], [13.5, -1], [-13.5, -1]].sort((a, b) => d2([b[0], 7.7 * b[1], 3.2]) - d2([a[0], 7.7 * a[1], 3.2]));

  for (const s of [1, -1]) if (!near(s) && Math.abs(E[1]) < 9) mirror(s);
  for (const [x, s] of W) if (!near(s)) wheel(x, s);
  add(TOP, C.light, 3, 'top');
  for (const [k, f] of Object.entries(GH)) if (seen(f)) {
    add(polyC(f), k === 'wind' || k === 'back' ? C.glass : C.light, 3, 'gh');
    if (k.startsWith('side')) for (const w of WIN) add(mapC(w, mGlass(k === 'sideL' ? 1 : -1)), C.glass, 2, 'gh');
  }
  for (const [x, s] of W) if (near(s)) wheel(x, s);
  for (const s of [1, -1]) if (near(s)) {
    add(mapC(SIDE, mSide(s)), C.light, 3, 'side');
    for (const [c, f, sw = 2] of SIDE_D) add(mapC(c, mSide(s)), f, sw, 'side');
  }
  // мелкие детали — прямое отображение; контуры и длинные линии идут по изгибу грани
  const face = (outline, decals, m, tag) => {
    add(mapQ(outline, m), C.light, 3, tag);
    for (const [c, f, q] of decals) add(q ? mapQ(c, m) : mapC(c, m), f, 2, tag);
  };
  if (E[0] > 21) face(FRONT, FRONT_D, mFront, 'front');
  if (E[0] < -21) face(REAR, REAR_D, mRear, 'rear');
  for (const s of [1, -1]) if (near(s)) mirror(s);
  return items;
}

function carFile(name, dir, box, focus, pad = 10) {
  const f = fit(carItems(dir), box), b = f.box(focus);
  svg(name, f.body + vf(b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad));
}
const WHOLE = { cx: 160, cy: 100, w: 214, h: 148 }, SIDEBOX = { cx: 160, cy: 100, w: 224, h: 150 }, Q34 = { cx: 160, cy: 100, w: 224, h: 150 };
carFile('car-front', [1, 0, 0.12], WHOLE);
carFile('car-rear', [-1, 0, 0.12], WHOLE);
carFile('car-left', [0, 1, 0.025], SIDEBOX);
carFile('car-right', [0, -1, 0.025], SIDEBOX);
carFile('car-front-left', [0.77, 0.64, 0.25], Q34, ['front', 'wf']);
carFile('car-front-right', [0.77, -0.64, 0.25], Q34, ['front', 'wf']);
carFile('car-rear-left', [-0.77, 0.64, 0.25], Q34, ['rear', 'wr']);
carFile('car-rear-right', [-0.77, -0.64, 0.25], Q34, ['rear', 'wr']);

// ---------- крупные планы ----------
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
const barRow = (x, y, count, w, gap, h = 5, rx) => Array.from({ length: count }, (_, i) => bar(x + i * (w + gap), y, w, h, rx)).join('');

// 9. VIN под лобовым стеклом — через стекло
svg('car-vin-glass',
  P('M-6 174H326V206H-6Z', C.light) + P('M-6 160H326V174H-6Z', C.mid) +           // капот, жабо
  P('M82 160Q60 160 65 146L116 -6H326V160Z', C.glass, 0) +                          // стекло
  P('M68 108L326 100V160H82Q60 160 65 146Z', C.mid, 0) + ln([[68, 108], [326, 100]], 2) + // панель за стеклом
  rect(100, 114, 130, 24, 3, C.light, 2) + barRow(106.3, 123, 12, 7.5, 2.5, 6, 2) + // табличка VIN
  segs([[[236, 52], [270, 18]], [[254, 64], [296, 22]]], 3, C.light) +              // блики
  P('M82 160Q60 160 65 146L116 -6H326V160Z', null) +                                // контур стекла
  P('M40 160L94 -6H116L65 146Q60 160 82 160Z', C.light) +                           // передняя стойка
  ln([[128, 168], [258, 165]], 3, C.dark) + circ(266, 167, 4, C.dark, 0) +         // дворник
  vf(90, 104, 240, 148));

// 10. VIN, выбитый на кузове: стойка с фланцем точечной сварки, утопленная полоса
svg('car-vin-body',
  P('M-6 -6H326V206H-6Z', C.light, 0) + P('M-6 24H326V44H-6Z', C.glass) +
  Array.from({ length: 13 }, (_, i) => circ(14 + i * 26, 34, 3, C.mid, 2)).join('') +
  rect(42, 44, 10, 170, 0, C.mid) + P('M52 176H232Q262 176 272 206', null, 2) +
  rect(90, 88, 180, 24, 5, C.bg, 2) + ln([[96, 92.5], [264, 92.5]], 2, C.mid) + barRow(100.6, 99, 14, 8, 3.6, 6, 2) +
  vf(80, 78, 280, 122));

// 11. табличка изготовителя
svg('car-plate',
  rect(30, 18, 260, 164, 14, C.glass) + ln([[30, 172], [290, 172]], 2) +
  rect(86, 52, 148, 96, 6, C.light) +
  [[98, 64], [222, 64], [98, 136], [222, 136]].map(([x, y]) => circ(x, y, 4, C.mid, 2)).join('') +
  bar(110, 61, 100, 6) + bar(110, 79, 30) + bar(148, 79, 52) + bar(110, 95, 22) + bar(140, 95, 70) +
  bar(110, 111, 40) + bar(158, 111, 32) + bar(110, 127, 18) + bar(136, 127, 40) +
  vf(76, 42, 244, 158));

// 12. одометр: две шкалы и табло посередине
const dial = (cx, cy, r, needle) => circ(cx, cy, r, C.light) +
  segs(Array.from({ length: 9 }, (_, i) => 135 + i * 33.75).map((a) => [pol(cx, cy, r - 9, a), pol(cx, cy, r - 4, a)])) +
  ln([[cx, cy], pol(cx, cy, r - 12, needle)], 3, C.dark) + circ(cx, cy, 4.5, C.dark, 0);
svg('car-odometer',
  rect(38, 56, 244, 88, 44, C.mid) + dial(82, 100, 34, 200) + dial(238, 100, 34, 300) +
  rect(128, 74, 64, 52, 6, C.dark) + bar(150, 82, 20, 4) + barRow(132.5, 97, 6, 7, 2.6, 6, 2) + bar(153, 113, 14, 4) +
  vf(118, 64, 202, 136));

// 13. колесо под аркой
const spoke = (a) => pg([pol(160, 108, 10, a - 24), pol(160, 108, 37, a - 10), pol(160, 108, 37, a + 10), pol(160, 108, 10, a + 24)], C.light, 2);
svg('car-wheel',
  P('M-6 136H91.5A74 74 0 1 1 228.5 136H326V-6H-6Z', C.light) + ln([[-6, 30], [326, 30]], 2) + ln([[300, 30], [300, 136]], 2) +
  circ(160, 108, 61, C.dark, 3, C.dark) + circ(160, 108, 52, null, 2) +
  circ(160, 108, 41, C.light) + circ(160, 108, 36, C.mid, 2) +
  [0, 72, 144, 216, 288].map((a) => spoke(a - 90)).join('') + circ(160, 108, 12, C.light, 2) + circ(160, 108, 5, C.mid, 2) +
  vf(89, 37, 231, 179));

// 14. салон с заднего сиденья
const ring = (cx, cy, rx, ry, t, fill) => { const e = (a, b) => `M${n(cx - a)} ${n(cy)}a${n(a)} ${n(b)} 0 1 0 ${n(2 * a)} 0a${n(a)} ${n(b)} 0 1 0 ${n(-2 * a)} 0Z`;
  return `<path fill-rule="evenodd" d="${e(rx, ry)}${e(rx - t, ry - t)}" fill="${fill}"/>`; };
const seat = (x) => rect(x, 106, 90, 110, 20, C.light) + rect(x + 13, 120, 64, 96, 12, null, 2) +
  ln([[x + 33, 92], [x + 33, 106]]) + ln([[x + 57, 92], [x + 57, 106]]) + rect(x + 20, 60, 50, 34, 13, C.light);
svg('car-interior',
  P('M-6 -6H326V24H-6Z', C.light) + P('M54 24H266L294 78H26Z', C.glass) +
  P('M-6 24H54L26 78H-6Z', C.light) + P('M326 24H266L294 78H326Z', C.light) +
  ln([[160, 24], [160, 30]], 2) + rect(144, 30, 32, 10, 5, C.mid, 2) +
  P('M-6 78H326V130H-6Z', C.mid) + rect(141, 86, 38, 22, 4, C.dark, 2) +
  ring(102, 96, 37, 28, 6, C.dark) + rect(146, 128, 28, 80, 6, C.mid) +
  seat(56) + seat(174) +
  vf(46, 50, 274, 190));

// 15. моторный отсек спереди, капот открыт: фары под отсеком
svg('car-engine',
  P('M58 6H262L282 36H38Z', C.light) + P('M74 12H246L260 30H60Z', C.mid, 2) +
  P('M28 40H292V184Q292 194 282 194H38Q28 194 28 184Z', C.light) +
  P('M50 40H270V148Q270 152 266 152H54Q50 152 50 148Z', C.mid) + segs([[[60, 50], [70, 33]]]) +
  pg([[36, 158], [88, 162], [86, 174], [38, 172]], C.glass, 2) + pg([[284, 158], [232, 162], [234, 174], [282, 172]], C.glass, 2) +
  rect(120, 160, 80, 20, 6, C.mid, 2) + segs([[[128, 167], [192, 167]], [[128, 173], [192, 173]]]) +
  rect(92, 132, 136, 14, 3, C.glass, 2) + segs(Array.from({ length: 12 }, (_, i) => [[99 + i * 11.1, 135.5], [99 + i * 11.1, 142.5]])) +
  rect(56, 56, 38, 40, 4, C.glass) + circ(66, 64, 4, C.light, 2) + circ(84, 64, 4, C.dark, 2) + bar(63, 80, 24, 5) +
  rect(226, 56, 38, 30, 8, C.glass) + circ(245, 56, 7, C.mid, 2) + circ(248, 112, 9, C.light) + circ(248, 112, 4, C.mid, 2) +
  rect(112, 58, 96, 58, 10, C.light) + rect(122, 66, 76, 26, 6, C.glass, 2) +
  segs([[[134, 75], [186, 75]], [[134, 83], [186, 83]]]) +
  [[128, 104], [146, 104], [174, 104], [192, 104]].map(([x, y]) => circ(x, y, 3.5, C.mid, 2)).join('') + circ(160, 104, 6, C.mid, 2) +
  vf(102, 48, 218, 126));

// 16. вмятина и царапины на двери
svg('car-damage',
  P('M-6 -6H326V30H-6Z', C.glass) + P('M-6 30H326V38H-6Z', C.mid) + P('M-6 38H326V206H-6Z', C.light) +
  ln([[44, 38], [44, 206]]) + ln([[-6, 84], [326, 80]], 2) +
  rect(204, 46, 60, 22, 11, C.glass, 2) + rect(210, 52, 48, 10, 5, C.light, 2) +
  '<g transform="rotate(-10 130 128)">' + ell(130, 128, 38, 22, null, 2) + ell(130, 129, 25, 14, C.glass, 2) + ell(131, 130, 12, 6.5, C.mid, 2) + '</g>' +
  ln([[162, 110], [194, 122], [234, 136]], 2, C.dark) + ln([[170, 128], [210, 143], [238, 150]], 2, C.dark) +
  ln([[158, 146], [188, 154]], 2, C.dark) +
  vf(82, 96, 248, 162));

// ---------- документы ----------
const page = (x, y, w, h) => rect(x, y, w, h, 4, C.light);
const rows = (x, y0, step, lens, h = 5) => lens.map((ls, i) => {
  let cx = x; return [].concat(ls).map((l) => { const b = bar(cx, y0 + i * step, l, h); cx += l + 7; return b; }).join('');
}).join('');
const squiggle = (x, y, w) => P(`M${n(x)} ${n(y)}c${n(w * .1)} -10 ${n(w * .2)} 8 ${n(w * .3)} -1s${n(w * .18)} -8 ${n(w * .3)} 1s${n(w * .2)} 3 ${n(w * .4)} -5`, null, 2, C.line);
const photo = (x, y, w, h) => rect(x, y, w, h, 3, C.glass, 2) +
  pg([[x + 4, y + h - 4], [x + w * .38, y + h * .42], [x + w * .6, y + h * .7], [x + w * .74, y + h * .55], [x + w - 4, y + h - 4]], C.mid, 2) +
  circ(x + w * .72, y + h * .3, Math.min(w, h) * .1, C.mid, 0);

// 17. ПТС: разворот
svg('doc-pts',
  rect(54, 30, 212, 142, 8, C.mid) + rect(60, 36, 100, 130, 3, C.light) + rect(160, 36, 100, 130, 3, C.light) +
  bar(72, 48, 76, 6) + rows(72, 66, 14, [[20, 46], [28, 30], [16, 52], [24, 40], [20, 48], [30, 26], [18, 36]]) +
  bar(172, 48, 76, 6) + rows(172, 66, 14, [[22, 44], [30, 34], [18, 50]]) +
  rect(172, 110, 76, 44, 2, null, 2) + segs([[[210, 110], [210, 154]], [[172, 124.7], [248, 124.7]], [[172, 139.3], [248, 139.3]]]) +
  [0, 1, 2].map((r) => bar(178, 115 + r * 14.7, 22, 4) + bar(216, 115 + r * 14.7, 18, 4)).join('') +
  vf(44, 20, 276, 182));

// 18. СТС: горизонтальная карточка
svg('doc-sts',
  rect(65, 40, 190, 120, 8, C.light, 0) + P('M65 64V48Q65 40 73 40H247Q255 40 255 48V64Z', C.mid, 0) +
  rect(65, 40, 190, 120, 8, null) + ln([[65, 64], [255, 64]], 2) +
  rows(78, 78, 14, [[22, 54], [30, 40], [18, 62], [26, 46], [20, 34], [28, 50]]) +
  rect(201, 78, 42, 42, 4, C.glass, 2) + bar(201, 132, 42, 5) + bar(209, 146, 34, 5) +
  vf(55, 30, 265, 170));

// 19. страховой полис: первая страница
svg('doc-policy',
  page(102, 19, 116, 162) + bar(126, 32, 68, 6) + rows(114, 48, 11, [[60], [44, 30]]) +
  rect(114, 74, 92, 42, 2, null, 2) + segs([[[150, 74], [150, 116]], [[114, 88], [206, 88]], [[114, 102], [206, 102]]]) +
  [0, 1, 2].map((r) => bar(119, 79 + r * 14, 24, 4) + bar(156, 79 + r * 14, 40 - r * 8, 4)).join('') +
  rows(114, 124, 11, [[84], [62]]) +
  circ(186, 160, 13, null, 2) + circ(186, 160, 8.5, null, 2) + squiggle(118, 160, 52) +
  vf(92, 9, 228, 191));

// 20. диагностическая карта: таблица проверок
svg('doc-diag',
  page(102, 19, 116, 162) + bar(124, 31, 72, 6) +
  rect(112, 46, 96, 124, 2, null, 2) + segs([[[128, 46], [128, 170]], ...[1, 2, 3, 4, 5, 6, 7].map((i) => [[112, 46 + i * 15.5], [208, 46 + i * 15.5]])]) +
  [54, 40, 62, 46, 58, 36, 50, 44].map((l, i) => rect(116, 50 + i * 15.5, 8, 8, 1.5, i % 3 === 2 ? C.light : C.mid, 2) +
    bar(134, 51.3 + i * 15.5, l, 5)).join('') +
  vf(92, 9, 228, 191));

// 21. договор: страница с подписями
svg('doc-contract',
  page(96, 15, 128, 170) + bar(122, 26, 76, 6) +
  rows(108, 42, 9.5, [[104], [96], [104], [58]], 4) + rows(108, 86, 9.5, [[104], [88], [100], [44]], 4) +
  ln([[112, 162], [152, 162]], 2) + ln([[168, 162], [208, 162]], 2) +
  squiggle(114, 150, 36) + squiggle(170, 152, 34) + bar(116, 168, 28, 4) + bar(172, 168, 26, 4) +
  vf(104, 130, 216, 178));

// 22. акт осмотра: первая страница с фотографиями
svg('doc-act',
  page(102, 19, 116, 162) + bar(124, 31, 72, 6) +
  rect(112, 46, 96, 70, 2, null, 2) + segs([[[150, 46], [150, 116]], [[112, 63.5], [208, 63.5]], [[112, 81], [208, 81]], [[112, 98.5], [208, 98.5]]]) +
  [0, 1, 2, 3].map((r) => bar(117, 52.3 + r * 17.5, 26, 4) + bar(155, 52.3 + r * 17.5, 46 - (r % 2) * 14, 4)).join('') +
  photo(112, 126, 44, 38) + photo(164, 126, 44, 38) +
  vf(92, 9, 228, 191));

// 23. своя загрузка — без видоискателя
svg('upload',
  rect(80, 38, 160, 124, 16, C.light, 0) +
  P('M80 140L134 84L168 122L192 100L240 140V146A16 16 0 0 1 224 162H96A16 16 0 0 1 80 146Z', C.mid) + circ(202, 72, 13, C.mid) +
  rect(80, 38, 160, 124, 16, null));

for (const [name, s] of Object.entries(files)) writeFileSync(join(OUT, name + '.svg'), s);
console.log(Object.keys(files).length + ' files ->', OUT);
