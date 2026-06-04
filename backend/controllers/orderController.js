const Order = require("../models/Order");
const { Product } = require("../models/Product");
const mongoose = require("mongoose");

const {
  validateOrderItems,
  reserveStockTransaction
} = require("../services/inventoryService");

/**
 * Generate unique order number.
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create order (guest or authenticated).
 * @route   POST /api/orders
 * @access  Public (guest) or Private (authenticated)
 */
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, notes, tax = 0, shipping = 0 } = req.body;

    const userId = req.user.id; // login mandatory

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.country ||
      !shippingAddress.zip
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid shipping address is required",
      });
    }

    const orderItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).lean();

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      let price = product.price;
      let name = product.title || product.brand || "Product";
      let image =
        Array.isArray(product.images) && product.images[0]
          ? product.images[0]
          : product.image?.url || "";

      if (
        item.variantSku &&
        Array.isArray(product.variants) &&
        product.variants.length > 0
      ) {
        const variant = product.variants.find(
          (v) => v.sku === item.variantSku
        );
        if (variant) {
          price = variant.price ?? product.price;
          name = variant.name || name;
        }
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const lineTotal = price * qty;
      calculatedSubtotal += lineTotal;

      orderItems.push({
        product: item.productId,
        variantSku: item.variantSku || null,
        name,
        quantity: qty,
        price,
        image,
      });
    }

    // Validate stock only (no deduction)
    const validation = await validateOrderItems(
      items.map((i) => ({
        productId: i.productId,
        variantSku: i.variantSku || null,
        quantity: Math.max(1, parseInt(i.quantity) || 1),
      }))
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
        errors: validation.errors,
      });
    }

    const finalTax = Number(tax) || 0;
    const finalShipping = Number(shipping) || 0;
    const total = calculatedSubtotal + finalTax + finalShipping;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentStatus: "pending",
      orderStatus: "pending",
      subtotal: calculatedSubtotal,
      tax: finalTax,
      shipping: finalShipping,
      total,
      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const verifyPayment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }
    
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data",
      });
    }
    

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }


    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot pay for cancelled order",
      });
    }
    

    // Deduct stock here
    const stockResult = await reserveStockTransaction(
      order.items.map(i => ({
        productId: i.product,
        variantSku: i.variantSku,
        quantity: i.quantity
      }))
    );
    
    if (!stockResult.ok) {
      return res.status(400).json({
        success: false,
        message: stockResult.message || "Inventory deduction failed",
      });
    }
    

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpayOrderId = razorpayOrderId;
    order.razorpaySignature = razorpaySignature;
    order.paidAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: "Payment verified and order confirmed",
      data: order,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * Get order by ID (owner or admin).
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }
    
    const order = await Order.findById(req.params.id)
      .populate("items.product", "brand sku title images image")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const isOwner = order.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin" || req.user.role === "Owner";

    if (!isOwner && !isAdmin) {
    return res.status(403).json({
    success: false,
    message: "Not authorized",
      });
    }
    res.json({ success: true, data: order });
    } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get orders for current user.
 * @route   GET /api/orders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getOrder,
  getMyOrders,
};

