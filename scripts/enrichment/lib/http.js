"use strict";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const DEFAULT_HEADERS = {
  "User-Agent": DEFAULT_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL with polite retries. Balmain sits behind Akamai; plain Node
 * fetches often fail with HTTP/2 stream errors or empty bodies — callers
 * should fall back to a saved HTML fixture when that happens.
 */
async function fetchText(url, options = {}) {
  const {
    timeoutMs = 30000,
    retries = 2,
    headers = {},
    redirect = "follow",
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect,
        signal: controller.signal,
        headers: { ...DEFAULT_HEADERS, ...headers },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        url: res.url,
        headers: Object.fromEntries(res.headers.entries()),
        text,
      };
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(800 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function fetchBuffer(url, options = {}) {
  const { timeoutMs = 30000, headers = {} } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      // Prefer raster formats IMS / Cloudinary fetch can ingest reliably
      headers: {
        ...DEFAULT_HEADERS,
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      status: res.status,
      url: res.url,
      contentType: res.headers.get("content-type") || "",
      buffer: buf,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pick a file extension from magic bytes first, then Content-Type, then URL.
 * SFCC often serves WebP for *.png URLs — trusting the URL alone blanks
 * browsers when the file is saved/served as image/png.
 */
function imageExtFromBuffer(buffer, url = "", contentType = "") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (buf.length >= 12) {
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return ".png";
    }
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
    if (
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP"
    ) {
      return ".webp";
    }
    if (buf.toString("ascii", 0, 3) === "GIF") return ".gif";
  }
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return ".jpg";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/avif")) return ".avif";
  const base = String(url || "").split("?")[0];
  const m = base.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  return ".jpg";
}

module.exports = {
  DEFAULT_UA,
  DEFAULT_HEADERS,
  sleep,
  fetchText,
  fetchBuffer,
  imageExtFromBuffer,
};
