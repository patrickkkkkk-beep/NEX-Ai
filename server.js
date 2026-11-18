// NEX AI server for Render. Node.js 18+; no npm packages required.
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const API_KEY = process.env.GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'no-store'
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, provider: 'Groq', configured: Boolean(API_KEY) });
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
    } catch {
      return send(res, 500, { error: 'index.html not found' });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!API_KEY) return send(res, 503, { error: 'کلید GROQ_API_KEY در تنظیمات Render ثبت نشده است.' });
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 1_000_000) return send(res, 413, { error: 'درخواست بیش از حد بزرگ است.' });
      }
      const body = JSON.parse(raw || '{}');
      if (!Array.isArray(body.messages) || !body.messages.length) return send(res, 400, { error: 'پیامی برای ارسال وجود ندارد.' });
      const messages = body.messages
        .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
        .slice(-40);
      if (!messages.length) return send(res, 400, { error: 'پیام معتبر پیدا نشد.' });
      const model = typeof body.model === 'string' && /^[a-zA-Z0-9._/-]{1,120}$/.test(body.model)
        ? body.model : DEFAULT_MODEL;
      const upstream = await fetch(API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7 })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return send(res, upstream.status, { error: data.error?.message || data.message || 'Groq API request failed' });
      }
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== 'string') return send(res, 502, { error: 'پاسخ قابل‌خواندن از Groq دریافت نشد.' });
      return send(res, 200, { reply, model });
    } catch (error) {
      return send(res, 400, { error: error.message || 'درخواست نامعتبر است.' });
    }
  }
  return send(res, 404, { error: 'Not found' });
});
server.listen(PORT, HOST, () => console.log(`NEX AI listening on ${HOST}:${PORT}`));
