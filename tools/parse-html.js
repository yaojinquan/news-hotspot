const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'news-hotspot.html');
const OUT = path.join(__dirname, '..', 'miniprogram', 'data', 'data.json');

const h = fs.readFileSync(SRC, 'utf8');

function text(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// meta: 采集时间
const metaMatch = h.match(/采集时间：([\d年月日]+)/);
const collectDate = metaMatch ? metaMatch[1] : '';

// stats cards
const statCards = [...h.matchAll(/<div class="stat-card"><div class="num">(\d+)<\/div><div class="label">([^<]+)<\/div><div class="sub">([^<]+)<\/div><\/div>/g)]
  .map(m => ({ platform: text(m[2]), count: +m[1], dist: m[3] }));

// value summary
const vsCards = [...h.matchAll(/<div class="vs-card vs-(high|mid|low)"><div class="vs-num">(\d+)<\/div><div class="vs-label">([^<]+)<\/div>/g)]
  .map(m => ({ level: m[1], num: +m[2], label: m[3] }));

// rows
const rows = [];
const trRe = /<tr>([\s\S]*?)<\/tr>/g;
let m;
while ((m = trRe.exec(h)) !== null) {
  const row = m[1];
  const td = (cls) => {
    const r = new RegExp(`<td class="${cls}"[^>]*>([\\s\\S]*?)<\/td>`).exec(row);
    return r ? r[1] : null;
  };
  const platformRaw = td('platform');
  const titleCell = td('title');
  const summary = td('summary');
  const cmt = td('comment-count');
  const value = td('value');
  if (!platformRaw || !titleCell) continue;
  const href = /href="([^"]+)"/.exec(titleCell);
  rows.push({
    platform: text(platformRaw).replace(/^[^\u4e00-\u9fa5A-Za-z0-9]+/, ''),
    seq: +(text(td('seq') || '')) || rows.length + 1,
    title: text(titleCell),
    url: href ? href[1] : '',
    summary: text(summary || ''),
    comments: text(cmt || ''),
    value: text(value || '')
  });
}

// group by platform
const groups = {};
for (const r of rows) {
  (groups[r.platform] = groups[r.platform] || []).push(r);
}

const data = {
  version: 1,
  collectDate,
  generatedAt: new Date().toISOString(),
  stats: {
    platforms: statCards,
    valueSummary: vsCards,
    total: rows.length
  },
  groups
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');
// 同步产出小程序内置模块（小程序 require 不支持 .json）
fs.writeFileSync(path.join(path.dirname(OUT), 'builtin.js'),
  'module.exports = ' + JSON.stringify(data, null, 2) + ';\n', 'utf8');
console.log('rows:', rows.length);
console.log('platforms:', Object.keys(groups));
console.log('collectDate:', collectDate);
for (const [k, v] of Object.entries(groups)) console.log(' ', k, v.length);
