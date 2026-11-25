"use strict";

/**
 * Probe whether a product image URL is actually usable for IMS galleries.
 *
 * Magento placeholders often HTTP 200 as tiny JPEGs (~1.5KB grey "M" logo),
 * so status-only checks are wrong. Detect via URL patterns, byte size,
 * known Magento placeholder hashes, and near-blank / low-entropy content.
 */

const crypto = require("crypto");

const DEFAULT_TIMEOUT_MS = 12000;
/** Real product photos after Spaces processing are typically >> 8KB */
const MIN_BYTES = 8000;

/**
 * Magento default product placeholder (balmainwatches.com & stock Magento).
 * md5 of https://…/media/catalog/product/placeholder/default/image.jpg (1595 bytes)
 */
const MAGENTO_PLACEHOLDER_MD5 = "e8be96b92892b36d827e312fc4c4f354";

/**
 * 8×8 greyscale perceptual hashes of known placeholders:
 * - raw Magento "M" JPEG
 * - same asset after DO Spaces sharp pipeline (trim + 800² white pad + webp)
 * - near-white collapsed variants seen in polluted Balmain Spaces uploads
 */
const KNOWN_PLACEHOLDER_IMG_HASHES = new Set([
  "e44607085049", // Magento raw 8x8
  "b544379c22dd", // Magento → Spaces pipeline
  "0650c82aecb3", // near-white Spaces variant from polluted galleries
]);

const PLACEHOLDER_URL_RE =
  /placeholder|placehold\.co|via\.placeholder|no[_-]?image|missing[_-]?image|default[_-]?product|\/placeholder\/|catalog\/product\/placeholder|Magento_Catalog\/images\/product\/placeholder|static\/version[^/]+\/(?:frontend|adminhtml)\/[^/]+\/[^/]+\/Magento_Catalog\/images\/product\/placeholder/i;

function isPlaceholderUrl(url) {
  return PLACEHOLDER_URL_RE.test(String(url || ""));
}

function md5Hex(buf) {
  return crypto.createHash("md5").update(buf).digest("hex");
}

/**
 * Content classification without network (buffer already fetched).
 * @returns {{ classification: 'real'|'placeholder'|'broken', reason: string, bytes: number, imgHash?: string }}
 */
async function classifyImageBuffer(buf, url = "") {
  const bytes = buf ? buf.length : 0;
  if (!buf || !bytes) {
    return { classification: "broken", reason: "empty_body", bytes: 0 };
  }
  if (isPlaceholderUrl(url)) {
    return { classification: "placeholder", reason: "url_pattern", bytes };
  }
  if (md5Hex(buf) === MAGENTO_PLACEHOLDER_MD5) {
    return { classification: "placeholder", reason: "magento_md5", bytes };
  }
  // Stock Magento placeholder is exactly 1595 bytes JPEG — reject that size
  // only when it also fails to look like a real photo (handled below via hash/size).
  if (bytes < MIN_BYTES) {
    return { classification: "placeholder", reason: "too_small", bytes };
  }

  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    try {
      // enrichment scripts often run without local sharp; use backend's copy
      const { createRequire } = require("module");
      const path = require("path");
      const backendRequire = createRequire(
        path.join(__dirname, "../../../backend/package.json")
      );
      sharp = backendRequire("sharp");
    } catch {
      // size+md5 already caught stock Magento PH; refuse to claim "real" without sharp
      return { classification: "broken", reason: "sharp_unavailable", bytes };
    }
  }

  try {
    const meta = await sharp(buf, { failOn: "none" }).metadata();
    const stats = await sharp(buf, { failOn: "none" }).stats();
    const channels = (stats.channels || []).filter(
      (c) => typeof c.entropy === "number"
    );
    const ent = channels.length
      ? Math.min(...channels.map((c) => c.entropy))
      : 99;
    const std = channels.length
      ? Math.min(...channels.map((c) => c.stdev))
      : 99;
    const mean = channels.length
      ? channels.reduce((a, c) => a + c.mean, 0) / channels.length
      : 0;

    const raw = await sharp(buf, { failOn: "none" })
      .resize(8, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();
    const imgHash = md5Hex(raw).slice(0, 12);

    if (KNOWN_PLACEHOLDER_IMG_HASHES.has(imgHash)) {
      return {
        classification: "placeholder",
        reason: "known_ph_hash",
        bytes,
        imgHash,
        width: meta.width,
        height: meta.height,
      };
    }
    // Near-blank / logo-on-white (post-Spaces Magento M often looks like this)
    if (ent < 2.2 && std < 30 && mean > 220) {
      return {
        classification: "placeholder",
        reason: "blankish_low_entropy",
        bytes,
        imgHash,
        width: meta.width,
        height: meta.height,
        ent,
        mean,
      };
    }
    if ((meta.width || 0) > 0 && (meta.width || 0) <= 120 && (meta.height || 0) <= 120) {
      return {
        classification: "placeholder",
        reason: "tiny_dimensions",
        bytes,
        imgHash,
        width: meta.width,
        height: meta.height,
      };
    }
    return {
      classification: "real",
      reason: "ok",
      bytes,
      imgHash,
      width: meta.width,
      height: meta.height,
      ent,
      mean,
    };
  } catch (err) {
    // Some retailer JPEGs (Tata Cliq progressive / odd containers) make sharp
    // throw even with failOn:"none". Browsers still render them — if the body
    // is large enough and not a known Magento placeholder, treat as real.
    if (bytes >= MIN_BYTES) {
      return {
        classification: "real",
        reason: "ok_decode_fallback",
        bytes,
      };
    }
    return {
      classification: "broken",
      reason: `decode_${err.message || "error"}`,
      bytes,
    };
  }
}

async function probeImageUrl(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      ok: false,
      classification: "broken",
      status: 0,
      bytes: 0,
      reason: "empty",
    };
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      classification: "broken",
      status: 0,
      bytes: 0,
      reason: "not_http",
    };
  }
  if (isPlaceholderUrl(trimmed)) {
    return {
      ok: false,
      classification: "placeholder",
      status: 0,
      bytes: 0,
      reason: "url_pattern",
      url: trimmed,
    };
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: (() => {
          try {
            return `${new URL(trimmed).origin}/`;
          } catch {
            return "https://www.balmainwatches.com/";
          }
        })(),
      },
    });
    clearTimeout(timer);
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    const finalUrl = res.url || trimmed;

    if (isPlaceholderUrl(finalUrl)) {
      return {
        ok: false,
        classification: "placeholder",
        status: res.status,
        bytes: buf.length,
        reason: "redirect_to_placeholder",
        contentType: ct,
        url: trimmed,
        finalUrl,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        classification: "broken",
        status: res.status,
        bytes: buf.length,
        reason: `http_${res.status}`,
        contentType: ct,
        url: trimmed,
      };
    }
    if (/text\/html/.test(ct)) {
      return {
        ok: false,
        classification: "broken",
        status: res.status,
        bytes: buf.length,
        reason: "html_not_image",
        contentType: ct,
        url: trimmed,
      };
    }

    const classified = await classifyImageBuffer(buf, finalUrl);
    return {
      ok: classified.classification === "real",
      classification: classified.classification,
      status: res.status,
      bytes: classified.bytes,
      reason: classified.reason,
      contentType: ct,
      url: trimmed,
      finalUrl: finalUrl !== trimmed ? finalUrl : undefined,
      imgHash: classified.imgHash,
      width: classified.width,
      height: classified.height,
    };
  } catch (err) {
    return {
      ok: false,
      classification: "broken",
      status: 0,
      bytes: 0,
      reason: err.name === "AbortError" ? "timeout" : err.message || "fetch_error",
      url: trimmed,
    };
  }
}

async function filterUsableImageUrls(urls, options = {}) {
  const list = Array.isArray(urls) ? urls : [];
  const usable = [];
  const reports = [];
  for (const url of list) {
    const probe = await probeImageUrl(url, options);
    reports.push({ url, ...probe });
    if (probe.ok) usable.push(typeof url === "string" ? url.trim() : url);
  }
  return { usable, reports };
}

/**
 * Classify every gallery slot. Product is BAD if any slot is placeholder/broken
 * OR placeholders are a majority of slots.
 */
async function classifyGallery(urls, options = {}) {
  const list = (Array.isArray(urls) ? urls : [])
    .map((u) => String(u || "").trim())
    .filter(Boolean);
  const slots = [];
  for (let i = 0; i < list.length; i++) {
    const probe = await probeImageUrl(list[i], options);
    slots.push({ index: i + 1, ...probe });
  }
  const real = slots.filter((s) => s.classification === "real").length;
  const placeholder = slots.filter((s) => s.classification === "placeholder")
    .length;
  const broken = slots.filter((s) => s.classification === "broken").length;
  const majorityPlaceholders =
    list.length > 0 && placeholder > list.length / 2;
  const bad =
    !list.length ||
    placeholder > 0 ||
    broken > 0 ||
    majorityPlaceholders;
  let verdict = "ok";
  if (!list.length) verdict = "empty";
  else if (placeholder > 0 || majorityPlaceholders) verdict = "polluted";
  else if (broken > 0) verdict = "broken";
  return {
    imageCount: list.length,
    real,
    placeholder,
    broken,
    majorityPlaceholders,
    bad,
    verdict,
    slots,
  };
}

module.exports = {
  probeImageUrl,
  filterUsableImageUrls,
  classifyImageBuffer,
  classifyGallery,
  isPlaceholderUrl,
  MIN_BYTES,
  MAGENTO_PLACEHOLDER_MD5,
  KNOWN_PLACEHOLDER_IMG_HASHES,
  PLACEHOLDER_URL_RE,
};
