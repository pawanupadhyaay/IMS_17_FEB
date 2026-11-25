"use strict";

/**
 * Publish-on-approve policy for enrichment → IMS.
 *
 * Policy: "Approved enrichment ⇒ isPublished true immediately (sold-out allowed)."
 *
 * - Scrape / Scan / Pull alone MUST NOT set isPublished.
 * - Approve (IMS Make live / Approve & publish) OR apply from an approved batch
 *   MUST set isPublished=true when title + ≥1 usable image exist.
 * - Inventory may be 0 (sold out but published).
 */

const PUBLISH_ON_APPROVE_POLICY =
  "Approved enrichment ⇒ isPublished true immediately (sold-out allowed).";

/**
 * Lightweight mirror of backend/utils/storeEligibility hasMinimalStorefrontData
 * (title + image; inventory ≥ 0 including 0). Kept local so CLI scripts do not
 * require the backend package graph for unit checks.
 */
function hasNonEmptyTitle(doc) {
  const t = doc?.title;
  return typeof t === "string" && t.trim().length > 0;
}

function hasUsableImage(doc) {
  if (!doc) return false;
  if (Array.isArray(doc.images)) {
    for (const u of doc.images) {
      if (typeof u === "string" && u.trim()) return true;
      if (u && typeof u === "object" && typeof u.url === "string" && u.url.trim()) {
        return true;
      }
    }
  }
  if (doc.imageUrl && typeof doc.imageUrl === "string" && doc.imageUrl.trim()) {
    return true;
  }
  if (doc.image?.url && typeof doc.image.url === "string" && doc.image.url.trim()) {
    return true;
  }
  return false;
}

function isPublishEligible(doc) {
  if (!doc) return false;
  const inv = doc.inventory;
  if (inv != null && Number(inv) < 0) return false;
  return hasNonEmptyTitle(doc) && hasUsableImage(doc);
}

/**
 * Resolve whether an apply-* batch run should auto-publish.
 *
 * Default ON when:
 *   - brand is already in review-approved.json, OR
 *   - this apply is the approval path (markApproved / writing review-approved), OR
 *   - caller passed --publish
 * Opt out with --no-publish.
 */
function resolvePublishFlag(argv, { brandApproved = false, isApprovalApply = false } = {}) {
  const args = Array.isArray(argv) ? argv : process.argv;
  if (args.includes("--no-publish")) return false;
  if (args.includes("--publish")) return true;
  // Approval apply path: default publish ON (business: go live immediately)
  if (brandApproved || isApprovalApply) return true;
  return false;
}

/**
 * If publish requested and merged doc is eligible, add isPublished to patch.
 * Never demotes an already-published product.
 * @returns {{ patch: object, published: boolean, reason: string }}
 */
function applyPublishOnApprove(mergedDoc, patch = {}, { publish = false } = {}) {
  const next = { ...patch };
  if (!publish) {
    delete next.isPublished;
    return {
      patch: next,
      published: false,
      reason: "publish_flag_off",
    };
  }
  if (mergedDoc?.isPublished === true && patch.isPublished !== false) {
    return {
      patch: next,
      published: false,
      reason: "already_published",
    };
  }
  if (!isPublishEligible(mergedDoc)) {
    delete next.isPublished;
    return {
      patch: next,
      published: false,
      reason: "missing_title_or_image",
    };
  }
  next.isPublished = true;
  return {
    patch: next,
    published: true,
    reason: "approved_enrichment",
  };
}

module.exports = {
  PUBLISH_ON_APPROVE_POLICY,
  hasNonEmptyTitle,
  hasUsableImage,
  isPublishEligible,
  resolvePublishFlag,
  applyPublishOnApprove,
};
