const { Product } = require("../models/Product");
const mongoose = require("mongoose");

/**
 * Get available stock for a product (main or variant).
 * @param {string} productId - Product _id
 * @param {string|null} variantSku - Variant SKU if buying a variant, else null for main product
 * @returns {Promise<{available: number, inStock: boolean}>}
 */
async function getAvailableStock(productId, variantSku = null) {
  const product = await Product.findById(productId).lean();
  if (!product) return { available: 0, inStock: false };

  if (variantSku && Array.isArray(product.variants) && product.variants.length > 0) {
    const variant = product.variants.find((v) => v.sku === variantSku);
    const available = variant ? (variant.inventory ?? 0) : 0;
    return { available, inStock: available > 0 };
  }

  const available = product.inventory ?? 0;
  return { available, inStock: available > 0 };
}

/**
 * Check if requested quantity is available.
 * @param {string} productId
 * @param {number} quantity
 * @param {string|null} variantSku
 * @returns {Promise<{ok: boolean, available: number}>}
 */
async function checkStock(productId, quantity, variantSku = null) {
  const { available } = await getAvailableStock(productId, variantSku);
  return { ok: available >= quantity, available };
}

/**
 * Reserve stock (decrement inventory) for order placement.
 * Uses atomic update to prevent overselling.
 * @param {string} productId
 * @param {number} quantity
 * @param {string|null} variantSku
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function reserveStock(productId, quantity, variantSku = null) {
  if (quantity <= 0) return { ok: false, message: "Invalid quantity" };

  if (variantSku) {
    const result = await Product.updateOne(
      {
        _id: productId,
        "variants.sku": variantSku,
        "variants.inventory": { $gte: quantity },
      },
      { $inc: { "variants.$.inventory": -quantity } }
    );
    if (result.modifiedCount === 0) {
      const { available } = await getAvailableStock(productId, variantSku);
      return { ok: false, message: `Insufficient stock. Available: ${available}` };
    }
    return { ok: true };
  }

  const result = await Product.updateOne(
    { _id: productId, inventory: { $gte: quantity } },
    { $inc: { inventory: -quantity } }
  );
  if (result.modifiedCount === 0) {
    const { available } = await getAvailableStock(productId, null);
    return { ok: false, message: `Insufficient stock. Available: ${available}` };
  }
  return { ok: true };
}




async function reserveStockTransaction(items) {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {

  try {
    for (const item of items) {
      const { productId, quantity, variantSku } = item;

      if (variantSku) {
        const result = await Product.updateOne(
          {
            _id: productId,
            "variants.sku": variantSku,
            "variants.inventory": { $gte: quantity },
          },
          { $inc: { "variants.$.inventory": -quantity } },
          { session }
        );

        if (result.modifiedCount === 0) {
          throw new Error("Insufficient variant stock");
        }
      } else {
        const result = await Product.updateOne(
          {
            _id: productId,
            inventory: { $gte: quantity },
          },
          { $inc: { inventory: -quantity } },
          { session }
        );

        if (result.modifiedCount === 0) {
          throw new Error("Insufficient stock");
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return { ok: true };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return { ok: false, message: error.message };
  }
});
}


/**
 * Release stock (increment inventory) - e.g. on order cancellation.
 * @param {string} productId
 * @param {number} quantity
 * @param {string|null} variantSku
 * @returns {Promise<{ok: boolean}>}
 */
async function releaseStock(productId, quantity, variantSku = null) {
  if (quantity <= 0) return { ok: true };

  if (variantSku) {
    await Product.updateOne(
      { _id: productId, "variants.sku": variantSku },
      { $inc: { "variants.$.inventory": quantity } }
    );
  } else {
    await Product.updateOne({ _id: productId }, { $inc: { inventory: quantity } });
  }
  return { ok: true };
}

/**
 * Validate all items in an order and return availability.
 * @param {Array<{productId: string, variantSku?: string, quantity: number}>} items
 * @returns {Promise<{valid: boolean, errors: Array<{productId: string, message: string}>}>}
 */
async function validateOrderItems(items) {
  const errors = [];
  for (const item of items) {
    const { ok, available } = await checkStock(
      item.productId,
      item.quantity,
      item.variantSku || null
    );
    if (!ok) {
      errors.push({
        productId: item.productId,
        message: `Insufficient stock. Requested: ${item.quantity}, Available: ${available}`,
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  getAvailableStock,
  checkStock,
  reserveStock,
  releaseStock,
  validateOrderItems,
  reserveStockTransaction,
};
