const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const razorpay = require("../config/razorpay");
const { Product } = require("../models/Product");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const User = require("../models/User");
const { logActivity } = require("../utils/logActivity");
const { updateDashboardStatsInBackground } = require("./productController");
const nodemailer = require("nodemailer");

// Reusable server-side high-fidelity HTML Invoice Generator for email attachments
function buildInvoiceHtml(order) {
  const subtotal = Number(order.subtotal) || 0;
  const shippingVal = Number(order.shipping) || 0;
  const totalVal = Number(order.total) || 0;
  const discount = Math.max(0, subtotal - totalVal + shippingVal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const cgst = Number((afterDiscount * 0.025).toFixed(2));
  const sgst = Number((afterDiscount * 0.025).toFixed(2));
  
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <img src="${item.image || 'https://via.placeholder.com/60'}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" alt="Product Image" />
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; font-weight: bold; color: #111827;">
        ${item.name}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; color: #4b5563;">
        ${item.product?.brand || 'Watch'}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; color: #4b5563;">
        Watch
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; color: #111827;">
        ₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #111827; font-weight: bold;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: bold; color: #111827;">
        ₹${(Number(item.price) * (item.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  const shippingAddress = order.shippingAddress || {};

  // Pre-calculate conditional rows to avoid nesting backticks
  let discountRowsHtml = '';
  if (discount > 0) {
    discountRowsHtml = `
            <tr>
              <td style="text-align: left; color: #4b5563;">Discount</td>
              <td style="text-align: right; font-weight: bold; color: #dc2626;">- ₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="text-align: left; color: #4b5563;">After Discount</td>
              <td style="text-align: right; font-weight: bold; color: #111827;">₹${afterDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
    `;
  }

  let shippingRowHtml = '';
  if (shippingVal > 0) {
    shippingRowHtml = `
            <tr>
              <td style="text-align: left; color: #4b5563;">Shipping & Handling</td>
              <td style="text-align: right; color: #374151;">₹${shippingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderNumber}</title>
      <meta charset="utf-8" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body {
          font-family: 'Inter', Arial, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 40px;
          background-color: #fff;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #f3f4f6;
          padding-bottom: 20px;
        }
        .invoice-title {
          font-family: 'Georgia', serif;
          font-size: 40px;
          font-weight: normal;
          color: #111827;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .brand-logo {
          text-align: right;
        }
        .brand-name {
          font-family: 'Georgia', serif;
          font-size: 28px;
          font-weight: 900;
          color: #b91c1c;
          letter-spacing: 2px;
          text-transform: uppercase;
          line-height: 1;
        }
        .brand-sub {
          font-size: 10px;
          letter-spacing: 5px;
          color: #6b7280;
          text-transform: uppercase;
          margin-top: 4px;
          font-weight: 700;
        }
        .meta-grid {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 45px;
          font-size: 12px;
          line-height: 1.6;
        }
        .meta-block {
          flex: 1;
          color: #374151;
        }
        .meta-title {
          font-weight: 900;
          text-transform: uppercase;
          font-size: 11px;
          color: #111827;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .table-container {
          margin-bottom: 35px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background-color: #0b3a82;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 12px 10px;
          text-align: left;
          border: none;
        }
        .summary-box {
          display: flex;
          justify-content: flex-end;
          margin-top: 25px;
        }
        .summary-table {
          width: 300px;
          font-size: 13px;
        }
        .summary-table td {
          padding: 8px 10px;
          border: none;
        }
        .total-row {
          background-color: #fcf0b1;
          font-weight: 900;
          font-size: 14px;
          color: #000;
        }
        .total-row td {
          border-top: 2px solid #111827 !important;
          border-bottom: 2px solid #111827 !important;
          padding: 10px 10px !important;
        }
        .footer {
          margin-top: 70px;
          border-top: 2px solid #f3f4f6;
          padding-top: 24px;
          text-align: center;
          font-size: 11px;
          color: #6b7280;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1 class="invoice-title">Invoice</h1>
          <div class="brand-logo">
            <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="height: 40px; width: auto; object-fit: contain;" />
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-block">
            <div class="meta-title">FROM:</div>
            <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
            Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007
          </div>

          <div class="meta-block">
            <div class="meta-title">BILL TO:</div>
            <strong>${shippingAddress.name || 'Valued Customer'}</strong><br/>
            ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br/>' : ''}
            ${shippingAddress.city || ''} - ${shippingAddress.pincode || shippingAddress.zip || ''}<br/>
            ${shippingAddress.state || ''}
          </div>

          <div class="meta-block">
            <div class="meta-title">SHIP TO:</div>
            <strong>${shippingAddress.name || 'Valued Customer'}</strong><br/>
            ${shippingAddress.address || ''}<br/>
            ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br/>' : ''}
            ${shippingAddress.city || ''} - ${shippingAddress.pincode || shippingAddress.zip || ''}<br/>
            ${shippingAddress.state || ''}
          </div>

          <div class="meta-block">
            <div class="meta-title">INVOICE DETAILS:</div>
            <strong>Invoice No:</strong> ${order.orderNumber}<br/>
            <strong>Date:</strong> ${new Date(order.paidAt || order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            <strong>Place of Supply:</strong> ${shippingAddress.state || 'Karnataka'}<br/>
            <strong>Payment Method:</strong> ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'ONLINE'}
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 10%; text-align: center;">IMAGE</th>
                <th style="width: 30%;">PRODUCT DESCRIPTION</th>
                <th style="width: 10%;">BRAND</th>
                <th style="width: 10%;">CATEGORY</th>
                <th style="width: 15%; text-align: right;">UNIT PRICE</th>
                <th style="width: 10%; text-align: center;">QTY</th>
                <th style="width: 15%; text-align: right;">NET AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div class="summary-box">
          <table class="summary-table">
            <tr>
              <td style="text-align: left; color: #4b5563;">Subtotal INR</td>
              <td style="text-align: right; font-weight: bold; color: #111827;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${discountRowsHtml}
            <tr>
              <td style="text-align: left; color: #4b5563;">CGST 2.5%</td>
              <td style="text-align: right; color: #374151;">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="text-align: left; color: #4b5563;">SGST 2.5%</td>
              <td style="text-align: right; color: #374151;">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            ${shippingRowHtml}
            <tr class="total-row">
              <td style="text-align: left;">Total INR</td>
              <td style="text-align: right;">₹${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
          Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007
        </div>
      </div>
    </body>
    </html>
  `;
}

// @desc    Create Razorpay Order
// @route   POST /api/store/create-order
// @access  Public (Store)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, couponCode, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Valid items array is required" });
    }

    let totalAmount = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: "Invalid product ID or quantity" });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      // Check Inventory
      if (product.inventory < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.title || 'Product'}. Available: ${product.inventory}` 
        });
      }

      totalAmount += (product.price || 0) * item.quantity;
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Total amount must be greater than zero" });
    }

    let finalAmount = totalAmount;
    let discountAmount = 0;

    // Apply Coupon Logic
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        if (new Date(coupon.validUntil) < new Date()) {
          return res.status(400).json({ success: false, message: "Coupon has expired" });
        }
        if (totalAmount < coupon.minOrderAmount) {
          return res.status(400).json({ success: false, message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}` });
        }

        discountAmount = totalAmount * (coupon.discountPercentage / 100);
      } else if (couponCode.toUpperCase() === 'TEST1') {
        // Special Test Coupon bypasses database check
        discountAmount = totalAmount; 
      } else {
        return res.status(400).json({ success: false, message: "Invalid or inactive coupon code" });
      }
    }

    // Shipping Logic (Free shipping above ₹50,000, but ₹1 for exactly ₹50,000 for testing)
    let shippingAmount = totalAmount === 50000 ? 1 : (totalAmount > 50000 ? 0 : 99);
    finalAmount = (totalAmount - discountAmount) + shippingAmount;

    // --- TEST MODE OVERRIDE ---
    // If the coupon TEST1 is used, we force everything to 0 and total to ₹1 for production testing.
    if (couponCode && couponCode.toUpperCase() === 'TEST1') {
        shippingAmount = 0;
        finalAmount = 1;
    }

    // JUGAAD: Razorpay strictly rejects amounts < ₹1 (100 paise). 
    // If a coupon makes the price 0, we clamp it to ₹1 to bypass the Razorpay badge error and still allow checkout.
    if (finalAmount <= 0) {
      finalAmount = 1;
    }

    const options = {
      amount: Math.round(finalAmount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const rzpOrder = await razorpay.orders.create(options);

    // Build items for DB
    const orderItems = [];
    for (const item of items) {
       const product = await Product.findById(item.productId);
       orderItems.push({
          product: product._id,
          name: product.title || product.name || 'Store Product',
          quantity: Number(item.quantity) || 1,
          price: product.price || 0,
          image: product.images?.[0] || product.image?.url || '',
       });
    }

    // Capture User if logged in
    let authUser = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        authUser = await User.findById(decoded.id);
      } catch (err) {
        console.warn("Invalid token on checkout ignored", err.message);
      }
    }

    // Get a dummy user (Owner) if guest checkout
    const dummyUser = await User.findOne({ role: 'Owner' }) || await User.findOne();
    const assignedUserId = authUser ? authUser._id : (dummyUser ? dummyUser._id : null);

    if (!assignedUserId) {
      return res.status(500).json({ success: false, message: "Server configuration error: No administrative user found for order assignment." });
    }

    // Save pending Order to database so it shows up in "My Store" Orders
    const newOrderId = new mongoose.Types.ObjectId();
    const newOrder = await Order.create({
       _id: newOrderId,
       orderNumber: `ORD-${newOrderId.toString().slice(-6).toUpperCase()}`,
       user: assignedUserId,
       items: orderItems,
       shippingAddress: shippingAddress ? {
         name: shippingAddress.fullName || shippingAddress.name || 'Guest',
         email: shippingAddress.email || '',
         phone: shippingAddress.phone || '',
         address: shippingAddress.addressLine1 || shippingAddress.address || '',
         addressLine2: shippingAddress.addressLine2 || '',
         city: shippingAddress.city || '',
         state: shippingAddress.state || '',
         pincode: shippingAddress.pincode || shippingAddress.zip || '',
         zip: shippingAddress.pincode || shippingAddress.zip || '',
         country: 'India',
       } : {
         name: 'Store Guest',
         address: '',
         city: '',
         country: 'India',
       },
       paymentStatus: "pending",
       orderStatus: "pending",
       razorpayOrderId: rzpOrder.id,
       subtotal: totalAmount,
       tax: 0,
       shipping: shippingAmount,
       total: finalAmount,
    });

    res.status(200).json({
      success: true,
      originalAmount: totalAmount,
      discountAmount,
      finalAmount,
      order: rzpOrder,
      orderNumber: newOrder.orderNumber,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/store/verify-payment
// @access  Public (Store)
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, couponCode, paymentMethod, paymentVpa } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // Increment coupon uses if applied
      if (couponCode) {
        await Coupon.findOneAndUpdate(
          { code: couponCode.toUpperCase() },
          { $inc: { uses: 1 } }
        );
      }

      // Update Order status to paid - only if it was pending
      const updatedOrder = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: 'pending' },
        { 
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date(),
          paymentMethod: paymentMethod || '',
          paymentVpa: paymentVpa || '',
        },
        { new: true }
      ).populate('items.product', 'brand images');

      // Reduce Inventory for each item (Dynamic IMS Sync)
      if (updatedOrder && updatedOrder.items) {
        for (const item of updatedOrder.items) {
          if (item.product) {
            // Atomic update to ensure inventory never goes below zero
            const p = await Product.findByIdAndUpdate(item.product, [
              { 
                $set: { 
                  inventory: { $max: [0, { $subtract: ["$inventory", item.quantity] }] } 
                } 
              }
            ], { new: true });

            if (p) {
              // Log the activity for the IMS Audit Trail
              logActivity({
                actionType: 'UPDATE',
                brand: p.brand || '',
                sku: p.sku || '',
                productId: p._id,
                adminId: updatedOrder.user, // Record against the user/admin associated with the order
                adminName: 'SYSTEM (SALE)',
                adminEmail: 'automated@ims.com',
                metadata: {
                  orderId: updatedOrder._id,
                  orderNumber: updatedOrder.orderNumber,
                  previousInventory: p.inventory + item.quantity,
                  newInventory: p.inventory,
                  saleQuantity: item.quantity
                }
              });
            }
          }
        }
      }

      // Trigger background stats update to keep IMS Dashboard in sync
      updateDashboardStatsInBackground();

      // Send receipt email to customer asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          // Resolve customer email asynchronously to support profile-linked emails when shipping email is empty
          let customerEmail = updatedOrder.shippingAddress?.email;
          if (!customerEmail && updatedOrder.user) {
            try {
              const userDoc = await User.findById(updatedOrder.user);
              if (userDoc) {
                customerEmail = userDoc.email;
              }
            } catch (userErr) {
              console.error("⚠️ Failed to resolve customer user profile email:", userErr);
            }
          }

          if (!customerEmail) {
            console.log(`⚠️ Skip order confirmation email: No email address captured or found for Order ${updatedOrder.orderNumber}`);
            return;
          }

          if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[TEST MODE] Order Receipt email simulated for ${customerEmail}. Order: ${updatedOrder.orderNumber}`);
            return;
          }

          // Use custom SMTP transport settings if EMAIL_HOST is provided
          let transporterConfig;
          if (process.env.EMAIL_HOST) {
            transporterConfig = {
              host: process.env.EMAIL_HOST,
              port: Number(process.env.EMAIL_PORT) || 465,
              secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
              tls: {
                rejectUnauthorized: false
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
            };
          } else {
            transporterConfig = {
              service: "gmail",
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            };
          }

          const transporter = nodemailer.createTransport(transporterConfig);

            const itemsRows = updatedOrder.items.map(item => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                  <img src="${item.image || 'https://via.placeholder.com/60'}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" alt="Watch" />
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; text-align: left;"><strong>${item.name}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; text-align: left;">${item.product?.brand || 'Watch'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
              </tr>
            `).join('');

            // Generate high-fidelity HTML invoice attachment
            const invoiceHtml = buildInvoiceHtml(updatedOrder);

            const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;

            const mailOptions = {
              from: senderEmail,
              to: customerEmail,
              subject: `Order Confirmed - #${updatedOrder.orderNumber}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
                    <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
                  </div>
                  
                  <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Thank you for your purchase!</h2>
                  <p>Hello <strong>${updatedOrder.shippingAddress?.name || 'Customer'}</strong>,</p>
                  <p>We are delighted to confirm your order. Your premium timepiece is being prepared for secure, fully insured dispatch.</p>
                  
                  <div style="background-color: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 10px; padding: 20px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="color: #888; font-size: 12px; text-transform: uppercase; padding-bottom: 5px; text-align: left;">Order Number</td>
                        <td style="color: #888; font-size: 12px; text-transform: uppercase; padding-bottom: 5px; text-align: right;">Date</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; font-size: 15px; color: #000; text-align: left;">#${updatedOrder.orderNumber}</td>
                        <td style="font-weight: bold; font-size: 15px; color: #000; text-align: right;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0b3a82; border-bottom: 2px solid #0b3a82; padding-bottom: 5px; margin-top: 30px; text-align: left;">Items Ordered</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                      <tr>
                        <th style="text-align: center; padding: 10px; background-color: #f9f9f9; font-size: 11px; text-transform: uppercase; color: #666; width: 60px;">Image</th>
                        <th style="text-align: left; padding: 10px; background-color: #f9f9f9; font-size: 11px; text-transform: uppercase; color: #666;">Description</th>
                        <th style="text-align: left; padding: 10px; background-color: #f9f9f9; font-size: 11px; text-transform: uppercase; color: #666; width: 15%;">Brand</th>
                        <th style="text-align: center; padding: 10px; background-color: #f9f9f9; font-size: 11px; text-transform: uppercase; color: #666; width: 10%;">Qty</th>
                        <th style="text-align: right; padding: 10px; background-color: #f9f9f9; font-size: 11px; text-transform: uppercase; color: #666; width: 20%;">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                      <tr>
                        <td colspan="2" style="padding: 10px; font-weight: bold; text-align: right; font-size: 13px;">Subtotal:</td>
                        <td style="padding: 10px; font-weight: bold; text-align: right; font-size: 13px;">₹${updatedOrder.subtotal.toLocaleString('en-IN')}</td>
                      </tr>
                      ${updatedOrder.shipping > 0 ? `
                      <tr>
                        <td colspan="2" style="padding: 10px; text-align: right; font-size: 12px; color: #666;">Shipping:</td>
                        <td style="padding: 10px; text-align: right; font-size: 12px; color: #666;">₹${updatedOrder.shipping.toLocaleString('en-IN')}</td>
                      </tr>
                      ` : ''}
                      <tr style="background-color: #fcf0b1; font-weight: bold; font-size: 15px;">
                        <td colspan="2" style="padding: 10px; border-top: 2px solid #000; border-bottom: 2px solid #000; text-align: right;">Total Paid (INR):</td>
                        <td style="padding: 10px; border-top: 2px solid #000; border-bottom: 2px solid #000; text-align: right; color: #b91c1c;">₹${updatedOrder.total.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0b3a82; border-bottom: 2px solid #0b3a82; padding-bottom: 5px; margin-top: 40px; text-align: left;">Shipping Address</h3>
                  <p style="line-height: 1.6; font-size: 13px; color: #555; margin-top: 10px; text-align: left;">
                    <strong>${updatedOrder.shippingAddress?.name || ''}</strong><br/>
                    ${updatedOrder.shippingAddress?.address || ''}<br/>
                    ${updatedOrder.shippingAddress?.addressLine2 ? updatedOrder.shippingAddress.addressLine2 + '<br/>' : ''}
                    ${updatedOrder.shippingAddress?.city || ''} - ${updatedOrder.shippingAddress?.pincode || updatedOrder.shippingAddress?.zip || ''}<br/>
                    ${updatedOrder.shippingAddress?.state || ''}<br/>
                    India
                  </p>

                  <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
                    <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
                    Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007<br/>
                    If you have any inquiries, please contact us at orders@samaywatch.in
                  </div>
                </div>
              `,
              attachments: [
                {
                  filename: `invoice_${updatedOrder.orderNumber}.html`,
                  content: invoiceHtml
                }
              ]
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Order confirmation email dispatched successfully to ${customerEmail}`);
          } catch (err) {
            console.error("❌ Failed to dispatch order confirmation email:", err);
          }
        });

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
  } catch (error) {
    console.error("Razorpay Verify Payment Error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

// @desc    Validate Coupon API for Frontend Cart
// @route   POST /api/store/validate-coupon
// @access  Public (Store)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({ success: false, message: "Coupon code and order amount are required" });
    }

    // --- TEST MODE OVERRIDE ---
    if (code.toUpperCase() === 'TEST1') {
      return res.status(200).json({
        success: true,
        message: "Test Mode Enabled: Checkout for ₹1",
        data: {
          code: 'TEST1',
          discountPercentage: 100,
          minOrderAmount: 0
        }
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: "This coupon is currently inactive" });
    }

    if (new Date(coupon.validUntil) < new Date()) {
      return res.status(400).json({ success: false, message: "This coupon has expired" });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order amount to apply this coupon is ₹${coupon.minOrderAmount}` });
    }

    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      data: {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        minOrderAmount: coupon.minOrderAmount
      }
    });

  } catch (error) {
    console.error("Coupon Validation Error:", error);
    res.status(500).json({ success: false, message: "Failed to validate coupon" });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/store/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { user: req.user._id },
        { "shippingAddress.phone": req.user.mobile }
      ]
    })
      .populate('items.product', 'title images brand slug')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Fetch My Orders Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user orders" });
  }
};

// @desc    Get Razorpay payment details (method, VPA, etc.) — captures UPI ID
// @route   GET /api/store/payment-details/:paymentId
// @access  Public (Store)
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: 'Payment ID required' });
    const payment = await razorpay.payments.fetch(paymentId);
    res.status(200).json({
      success: true,
      method: payment.method || '',
      vpa: payment.vpa || '',
      bank: payment.bank || '',
      wallet: payment.wallet || '',
    });
  } catch (error) {
    console.error('GetPaymentDetails Error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch payment details' });
  }
};

