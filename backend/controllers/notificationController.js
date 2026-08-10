const BackInStockSubscription = require("../models/BackInStockSubscription");
const { Product } = require("../models/Product");

/**
 * @desc    Subscribe to back in stock notification
 * @route   POST /api/notifications/subscribe
 * @access  Public (Supports optional Auth)
 */
const subscribeToBackInStock = async (req, res) => {
  try {
    const { productId, email } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let subscriberEmail = "";
    let userId = null;

    if (req.user) {
      // Authenticated user
      subscriberEmail = req.user.email;
      userId = req.user._id;
    } else {
      // Guest user
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, message: "Email is required for guest subscriptions" });
      }
      subscriberEmail = email.trim().toLowerCase();
    }

    // Upsert subscription (update isNotified to false if they re-subscribe to a previously notified watch)
    const subscription = await BackInStockSubscription.findOneAndUpdate(
      { product: productId, email: subscriberEmail },
      { 
        user: userId, 
        isNotified: false,
        $unset: { notifiedAt: "" } // Clear previous notification timestamp if re-subscribing
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to back-in-stock notification alert",
      data: subscription
    });

  } catch (error) {
    console.error("Error in subscribeToBackInStock controller:", error);
    res.status(500).json({ success: false, message: "Subscription failed", error: error.message });
  }
};

module.exports = {
  subscribeToBackInStock
};
