// NEX AI - Render / Node.js 18+
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(value));
}
async function body(req, max = 12 * 1024 * 1024) {
  let chunks = [], size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error("حجم درخواست بیش از حد مجاز است."), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
async function gemini(pathname, payload, timeout = 120000) {
  if (!GEMINI_API_KEY) throw Object.assign(new Error("کلید GEMINI_API_KEY در Render تنظیم نشده است."), { status: 503 });
  const r = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeout)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error?.message || `Gemini API (${r.status})`), { status: r.status });
  return d;
}
function getText(data) {
  return (data.candidates?.[0]?.content?.parts || []).filter(p => p.text).map(p => p.text).join("\n");
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (req.method === "GET" && u.pathname === "/api/health") {
    return json(res, 200, { ok: true, groqConfigured: !!GROQ_API_KEY, geminiConfigured: !!GEMINI_API_KEY });
  }
  if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/index.html")) {
    try {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    } catch { return json(res, 500, { error: "index.html پیدا نشد." }); }
  }
  if (req.method !== "POST") return json(res, 404, { error: "مسیر پیدا نشد." });

  try {
    const b = await body(req);
    if (u.pathname === "/api/chat") {
      if (!GROQ_API_KEY) return json(res, 503, { error: "کلید GROQ_API_KEY در Render تنظیم نشده است." });
      if (!Array.isArray(b.messages)) return json(res, 400, { error: "پیام‌ها نامعتبرند." });
      const messages = b.messages.slice(-24).filter(m =>
        m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string"
      );
      const model = typeof b.model === "string" && /^[\w./-]{1,100}$/.test(b.model) ? b.model : GROQ_MODEL;
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.7 }),
        signal: AbortSignal.timeout(90000)
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return json(res, r.status, { error: d.error?.message || "خطا در Groq" });
      return json(res, 200, { reply: d.choices?.[0]?.message?.content || "" });
    }

    if (u.pathname === "/api/gemini/chat") {
      const prompt = String(b.prompt || "").trim();
      if (!prompt) return json(res, 400, { error: "پیام خالی است." });
      const parts = [];
      for (const im of (Array.isArray(b.images) ? b.images.slice(0, 3) : [])) {
        if (!im || !["image/png", "image/jpeg", "image/webp"].includes(im.mimeType)) continue;
        const raw = String(im.data || "").replace(/^data:[^,]+,/, "");
        if (raw.length < 10 || raw.length > 7_000_000) continue;
        parts.push({ inline_data: { mime_type: im.mimeType, data: raw } });
      }
      parts.push({ text: prompt.slice(0, 12000) });
      const d = await gemini("/models/gemini-3.8-flash:generateContent", {
        contents: [{ role: "user", parts }]
      });
      return json(res, 200, { reply: getText(d) || "پاسخی دریافت نشد." });
    }

    if (u.pathname === "/api/gemini/image") {
      const prompt = String(b.prompt || "").trim();
      if (!prompt) return json(res, 400, { error: "توضیح تصویر را وارد کن." });
      const d = await gemini("/interactions", {
        model: "gemini-nano-banana-2.1",
        input: prompt.slice(0, 8000),
        response_format: {
          type: "image",
          aspect_ratio: ["1:1","16:9","9:16","3:2","2:3"].includes(b.ratio) ? b.ratio : "1:1",
          image_size: "1K"
        }
      });
      if (!d.output_image?.data) throw Object.assign(new Error("در پاسخ Gemini تصویری پیدا نشد."), { status: 502 });
      return json(res, 200, { data: d.output_image.data, mimeType: d.output_image.mime_type || "image/png" });
    }

    if (u.pathname === "/api/gemini/video/start") {
      const prompt = String(b.prompt || "").trim();
      if (!prompt) return json(res, 400, { error: "توضیح ویدئو را وارد کن." });
      const model = "veo-3.1-generate-preview";
      const d = await gemini(`/models/${model}:predictLongRunning`, {
        instances: [{ prompt: prompt.slice(0, 7000) }],
        parameters: {
          aspectRatio: b.ratio === "9:16" ? "9:16" : "16:9",
          resolution: ["720p","1080p"].includes(b.resolution) ? b.resolution : "720p",
          numberOfVideos: 1
        }
      });
      if (!d.name) throw Object.assign(new Error("شناسه عملیات ویدئو از گوگل دریافت نشد."), { status: 502 });
      return json(res, 200, { operation: d.name });
    }

    if (u.pathname === "/api/gemini/video/status") {
      const operation = String(b.operation || "");
      if (!/^operations\/[A-Za-z0-9._-]+$/.test(operation)) return json(res, 400, { error: "شناسه عملیات نامعتبر است." });
      if (!GEMINI_API_KEY) return json(res, 503, { error: "کلید GEMINI_API_KEY تنظیم نشده است." });
      const r = await fetch(`${BASE}/${operation}`, {
        headers: { "x-goog-api-key": GEMINI_API_KEY },
        signal: AbortSignal.timeout(30000)
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return json(res, r.status, { error: d.error?.message || "خطا در بررسی وضعیت ویدئو" });
      if (!d.done) return json(res, 200, { done: false });
      if (d.error) return json(res, 200, { done: true, error: d.error.message || "ساخت ویدئو ناموفق بود." });
      const video = d.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
      if (!video?.uri) return json(res, 502, { error: "آدرس فایل ویدئو در پاسخ پیدا نشد." });
      const vr = await fetch(video.uri, {
        headers: { "x-goog-api-key": GEMINI_API_KEY },
        signal: AbortSignal.timeout(90000)
      });
      if (!vr.ok) return json(res, vr.status, { error: "دریافت فایل ویدئو ناموفق بود." });
      const buf = Buffer.from(await vr.arrayBuffer());
      if (buf.length > 24 * 1024 * 1024) return json(res, 413, { error: "فایل ویدئو برای نمایش مستقیم بیش از حد بزرگ است." });
      return json(res, 200, { done: true, data: buf.toString("base64"), mimeType: "video/mp4" });
    }

    return json(res, 404, { error: "API route not found" });
  } catch (e) {
    return json(res, e.status || (e.name === "TimeoutError" ? 504 : 500), { error: e.message || "خطای سرور" });
  }
});
server.requestTimeout = 180000;
server.headersTimeout = 190000;
server.listen(PORT, "0.0.0.0", () => console.log(`NEX AI listening on ${PORT}`));
