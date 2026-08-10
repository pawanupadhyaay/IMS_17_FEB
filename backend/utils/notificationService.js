const BackInStockSubscription = require("../models/BackInStockSubscription");
const { Product } = require("../models/Product");
const { sendBackInStockNotification } = require("./emailService");

/**
 * Checks for pending back-in-stock subscriptions and emails users.
 * @param {string} productId
 * @param {number} newInventory
 */
async function checkAndNotifyBackInStock(productId, newInventory) {
  try {
    if (newInventory <= 0) return;

    // Fetch pending subscriptions for this product
    const subscriptions = await BackInStockSubscription.find({
      product: productId,
      isNotified: false
    }).populate('user', 'name');

    if (!subscriptions || subscriptions.length === 0) return;

    // Fetch full product details
    const product = await Product.findById(productId);
    if (!product) return;

    console.log(`🔔 Found ${subscriptions.length} back-in-stock subscriptions for product: ${product.title}`);

    for (const sub of subscriptions) {
      const userName = sub.user?.name || "";
      // Dispatch email
      await sendBackInStockNotification(sub.email, userName, product);
      
      // Update subscription to avoid duplicate triggers
      sub.isNotified = true;
      sub.notifiedAt = new Date();
      await sub.save();
    }

    console.log(`✅ Completed dispatching back-in-stock notifications for product: ${product.title}`);
  } catch (error) {
    console.error("❌ Error in checkAndNotifyBackInStock service:", error);
  }
}

module.exports = {
  checkAndNotifyBackInStock
};
