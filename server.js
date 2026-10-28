const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
loadEnv(path.join(ROOT, '.env'));
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

function loadEnv(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    for (const line of data.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || match[1] in process.env) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (_) { /* .env is optional */ }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg'
};

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.includes('application/json') ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 100_000) { reject(new Error('Слишком большой запрос')); req.destroy(); } });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (_) { reject(new Error('Некорректный JSON')); }
    });
    req.on('error', reject);
  });
}

function platformWord(platform) {
  return ({ youtube: 'YouTube', instagram: 'Instagram Reels', tiktok: 'TikTok', telegram: 'Telegram', web: 'сайты сообщества' })[platform] || '';
}
function typeWord(type) {
  return ({ bloggers: 'блогеры авторы', podcasts: 'подкасты ведущие', experts: 'эксперты', business: 'бизнес бренды' })[type] || 'видеоблогеры авторы подкастов эксперты';
}
function buildQuery(body) {
  const input = typeof body.query === 'string' ? body.query.trim().slice(0, 160) : '';
  const platform = platformWord(body.platform);
  const kind = typeWord(body.clientType);
  // Keep the intent phrases grouped so Google does not ignore the niche/platform filters around OR.
  const ruTerms = '"ищу монтажера" OR "ищу монтажёра" OR "нужен монтажер" OR "ищем видеомонтажера" OR "ищу видеомонтажера"';
  const enTerms = '"looking for a video editor" OR "need a video editor" OR "hiring video editor"';
  const demandTerms = body.language === 'en' ? `(${enTerms})` : body.language === 'any' ? `((${ruTerms}) OR (${enTerms}))` : `(${ruTerms})`;
  const parts = [demandTerms, kind, input, platform].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').slice(0, 400);
}
function detectCategory(title, snippet, userType) {
  const str = `${title} ${snippet}`.toLowerCase();
  if (/подкаст|podcast/.test(str)) return 'Подкасты';
  if (/reels|эксперт|консультант|коуч|тренер/.test(str)) return 'Эксперты';
  if (/магазин|бренд|компания|бизнес|business/.test(str)) return 'Бизнес';
  if (userType === 'bloggers') return 'Блогеры и авторы';
  return 'Потенциальный клиент';
}
function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('instagram')) return 'Instagram / Reels';
    if (host.includes('tiktok')) return 'TikTok';
    if (host === 't.me' || host.includes('telegram')) return 'Telegram';
    return 'Веб-сайт';
  } catch (_) { return 'Веб-сайт'; }
}
function relevance(title, snippet, url) {
  const text = `${title} ${snippet} ${url}`.toLowerCase();
  let score = 55;
  for (const word of ['ищу монтаж', 'нужен монтаж', 'монтажер', 'монтажёр', 'видеомонтаж', 'video editor', 'hiring editor']) if (text.includes(word)) score += 7;
  for (const word of ['youtube', 'подкаст', 'reels', 'shorts', 'видео', 'контент']) if (text.includes(word)) score += 3;
  return Math.min(98, score);
}
async function realSearch(body) {
  const q = buildQuery(body);
  const params = new URLSearchParams({ engine: 'google', q, api_key: SERPAPI_KEY, num: '10' });
  if (body.language === 'en') { params.set('hl', 'en'); params.set('gl', 'us'); }
  else if (body.language === 'ru') { params.set('hl', 'ru'); params.set('gl', 'ru'); }
  const response = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(18000) });
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    throw new Error(info.error || `Поисковый сервис вернул ${response.status}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
  const seen = new Set();
  const results = organic.map((item, idx) => {
    const url = item.link || '';
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) return null;
    seen.add(url);
    const title = String(item.title || 'Публичная страница').slice(0, 240);
    const snippet = String(item.snippet || item.rich_snippet?.top?.extensions?.join(' · ') || 'Открой страницу, чтобы проверить, подходит ли она для сотрудничества.').slice(0, 600);
    let domain = 'источник'; try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}
    return {
      id: `web-${Buffer.from(url).toString('base64url').slice(0, 24)}`,
      name: title, url, domain, snippet,
      category: detectCategory(title, snippet, body.clientType),
      platform: detectPlatform(url),
      score: relevance(title, snippet, url),
      source: 'Google через SerpAPI', demo: false, position: item.position || idx + 1
    };
  }).filter(Boolean);
  const expectedPlatform = ({ youtube: 'YouTube', instagram: 'Instagram / Reels', tiktok: 'TikTok', telegram: 'Telegram', web: 'Веб-сайт' })[body.platform];
  return expectedPlatform ? results.filter(item => item.platform === expectedPlatform) : results;
}

const demoResults = [
  { id: 'demo-1', name: 'Канал о личных финансах', url: '#', domain: 'youtube.com', category: 'Блогеры и авторы', platform: 'YouTube', snippet: 'Демо-пример: автор регулярно выпускает образовательные видео и может быть заинтересован в монтаже выпусков и коротких нарезок.', score: 92, source: 'Демо-результат', demo: true },
  { id: 'demo-2', name: 'Подкаст «Новый взгляд»', url: '#', domain: 'youtube.com', category: 'Подкасты', platform: 'YouTube', snippet: 'Демо-пример: разговорный формат, из которого можно делать полные выпуски, Shorts и промо-фрагменты для соцсетей.', score: 87, source: 'Демо-результат', demo: true },
  { id: 'demo-3', name: 'Экспертный блог о фитнесе', url: '#', domain: 'instagram.com', category: 'Эксперты', platform: 'Instagram / Reels', snippet: 'Демо-пример: короткие обучающие ролики, где регулярный монтаж и субтитры могут помочь упаковать экспертный контент.', score: 83, source: 'Демо-результат', demo: true },
  { id: 'demo-4', name: 'Небольшой бренд одежды', url: '#', domain: 'tiktok.com', category: 'Бизнес', platform: 'TikTok', snippet: 'Демо-пример: бренд может использовать динамичные продуктовые видео и вертикальные ролики для социальных сетей.', score: 78, source: 'Демо-результат', demo: true }
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, serpApiConfigured: Boolean(SERPAPI_KEY), mode: SERPAPI_KEY ? 'live' : 'demo' });
  }
  if (req.method === 'POST' && url.pathname === '/api/search') {
    try {
      const body = await readBody(req);
      if (!['all', 'bloggers', 'podcasts', 'experts', 'business'].includes(body.clientType)) body.clientType = 'all';
      if (!['all', 'youtube', 'instagram', 'tiktok', 'telegram', 'web'].includes(body.platform)) body.platform = 'all';
      if (!['ru', 'en', 'any'].includes(body.language)) body.language = 'ru';
      if (!SERPAPI_KEY) {
        const query = typeof body.query === 'string' ? body.query.trim() : '';
        const expectedPlatform = ({ youtube: 'YouTube', instagram: 'Instagram / Reels', tiktok: 'TikTok', telegram: 'Telegram', web: 'Веб-сайт' })[body.platform];
        const results = demoResults.filter((x) => {
          const typeMatches = body.clientType === 'all' || ({ bloggers: ['Блогеры и авторы'], podcasts: ['Подкасты'], experts: ['Эксперты'], business: ['Бизнес'] }[body.clientType] || []).includes(x.category);
          const platformMatches = !expectedPlatform || x.platform === expectedPlatform;
          return typeMatches && platformMatches;
        });
        return send(res, 200, { mode: 'demo', notice: 'Демо-режим: это примеры интерфейса, а не реальные заявки или подтверждённые клиенты.', results: results.map(x => ({ ...x, snippet: query ? `${x.snippet} Запрос: «${query.slice(0, 100)}».` : x.snippet })) });
      }
      const results = await realSearch(body);
      return send(res, 200, { mode: 'live', notice: results.length ? 'Публичные результаты из поискового API. Проверь страницу и актуальность перед контактом.' : 'По запросу не найдено публичных результатов. Попробуй другую нишу или формулировку.', results });
    } catch (err) {
      return send(res, 502, { error: 'Не удалось выполнить поиск', detail: err.message || 'Неизвестная ошибка' });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Метод не поддерживается' });
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  // Serve only the three public frontend files; never expose .env or server-side sources.
  const allowedFiles = new Set(['/index.html', '/styles.css', '/app.js']);
  if (!allowedFiles.has(pathname)) return send(res, 404, 'Файл не найден', 'text/plain; charset=utf-8');
  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Доступ запрещён' });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Файл не найден', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});
server.listen(PORT, () => {
  console.log(`ClipFinder запущен: http://localhost:${PORT}`);
  console.log(SERPAPI_KEY ? 'Режим: реальный поиск через SerpAPI' : 'Режим: демо (добавь SERPAPI_KEY в .env для реального поиска)');
});
