const nodemailer = require("nodemailer");

// Create SMTP Transporter helper
function getTransporter() {
  let transporterConfig;
  if (process.env.EMAIL_HOST) {
    transporterConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
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
  return nodemailer.createTransport(transporterConfig);
}

const senderEmail = process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`;
const logoUrl = "https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png";

// 1. Send Transit Update Email (Shipped, Out for Delivery, Delivered)
exports.sendTransitUpdate = async (order) => {
  try {
    const transporter = getTransporter();
    const customerEmail = order.shippingAddress?.email || order.user?.email;
    if (!customerEmail) return;

    const orderNo = order.orderNumber || `#ORD-${order._id.toString().slice(-6).toUpperCase()}`;
    let subject = "";
    let statusTitle = "";
    let statusDescription = "";

    const status = order.orderStatus;

    if (status === "shipped") {
      subject = `Your Order ${orderNo} Has Been Shipped!`;
      statusTitle = "Your order is on the way!";
      statusDescription = `Great news! Your premium timepiece has been dispatched via <strong>${order.courierName || "our courier partner"}</strong>.`;
    } else if (status === "out_for_delivery") {
      subject = `Your Order ${orderNo} is Out for Delivery!`;
      statusTitle = "Out for Delivery Today!";
      statusDescription = `Your premium timepiece is out for delivery today! Our courier partner <strong>${order.courierName || "our courier partner"}</strong> will attempt delivery at your shipping address.`;
    } else if (status === "delivered") {
      subject = `Your Order ${orderNo} Has Been Delivered!`;
      statusTitle = "Delivered!";
      statusDescription = "Your premium timepiece has been successfully delivered to your shipping address. We hope you love your new watch!";
    } else {
      // General transit updates
      subject = `Transit Update for Order ${orderNo}`;
      statusTitle = "Transit Update";
      statusDescription = `Your order is currently in transit via <strong>${order.courierName || "our courier partner"}</strong>.`;
    }

    let trackingBlock = "";
    if (order.awbCode) {
      trackingBlock = `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Courier Partner:</strong> ${order.courierName || "Courier Partner"}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>AWB Number:</strong> ${order.awbCode}</p>
          ${order.trackingUrl ? `
            <div style="margin-top: 15px; text-align: center;">
              <a href="${order.trackingUrl}" target="_blank" style="background: #000; color: #fff; text-decoration: none; padding: 10px 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 6px; display: inline-block;">Track Shipment</a>
            </div>
          ` : ""}
        </div>
      `;
    }

    // Generate Items Table HTML
    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; width: 60px;">
          <img src="${item.image || 'https://via.placeholder.com/60'}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 6px; border: 1px solid #f5f5f5;" alt="Watch" />
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 13px; text-align: left; line-height: 1.4;">
          <strong style="color: #111;">${item.name}</strong>
          ${item.variantSku ? `<br/><span style="font-size: 10px; color: #999; text-transform: uppercase;">SKU: ${item.variantSku}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 13px; text-align: center; color: #666;">${item.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right; font-weight: bold; color: #111;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const discount = Math.max(0, (order.subtotal || 0) - (order.total || 0) + (order.shipping || 0));

    const pricingSummary = `
      <div style="margin-top: 20px; background: #fafafa; padding: 15px; border-radius: 10px; border: 1px solid #f0f0f0;">
        <table style="width: 100%; font-size: 13px; color: #555; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0;">Subtotal</td>
            <td style="text-align: right; padding: 4px 0; font-weight: 550; color: #222;">₹${order.subtotal?.toLocaleString('en-IN')}</td>
          </tr>
          ${discount > 0 ? `
          <tr style="color: #d32f2f;">
            <td style="padding: 4px 0; font-weight: bold;">Discount</td>
            <td style="text-align: right; padding: 4px 0; font-weight: bold;">-₹${discount.toLocaleString('en-IN')}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 4px 0;">Shipping</td>
            <td style="text-align: right; padding: 4px 0; font-weight: 550; color: #222;">${order.shipping > 0 ? `₹${order.shipping.toLocaleString('en-IN')}` : 'FREE'}</td>
          </tr>
          <tr style="font-size: 14px; font-weight: bold; color: #000;">
            <td style="padding: 10px 0 0 0; border-top: 1px solid #e0e0e0;">Total Paid</td>
            <td style="text-align: right; padding: 10px 0 0 0; color: #2e7d32; border-top: 1px solid #e0e0e0; font-size: 16px;">₹${order.total?.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>
    `;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
          <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
        </div>
        
        <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; text-align: center;">${statusTitle}</h2>
        <p>Hello <strong>${order.shippingAddress?.fullName || order.shippingAddress?.name || "Customer"}</strong>,</p>
        <p>${statusDescription}</p>
        
        ${trackingBlock}
        
        <!-- Order Items Section (Amazon Style) -->
        <div style="margin-top: 25px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #777; margin: 0 0 12px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #fafafa; font-size: 11px; text-transform: uppercase; color: #666;">
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #eee;">Item</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #eee;">Description</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>
        
        ${pricingSummary}
        
        <div style="margin-top: 25px; font-size: 12px; color: #777; background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee;">
          <p style="margin: 0 0 5px 0;">Order ID: <strong>${orderNo}</strong></p>
          <p style="margin: 0;">Delivery Address: ${order.shippingAddress?.address || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""} - ${order.shippingAddress?.pincode || ""}</p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; text-align: center; color: #999; margin: 0;">Need assistance? Reply to this email or contact us at <a href="mailto:orders@samaywatch.in" style="color: #000;">orders@samaywatch.in</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: senderEmail,
      to: customerEmail,
      subject: subject,
      html: htmlContent
    });

    console.log(`✉️ Transit update email dispatched successfully for order ${orderNo}`);
  } catch (error) {
    console.error("❌ Failed to send transit update email:", error.message);
  }
};

// 2. Send Support Ticket Raised Email
exports.sendTicketRaisedNotification = async (query) => {
  try {
    const transporter = getTransporter();
    const customerEmail = query.email;
    if (!customerEmail) return;

    const ticketId = `#TKT-${query._id.toString().slice(-6).toUpperCase()}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
          <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Concierge</p>
        </div>
        
        <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; text-align: center;">Support Ticket Raised</h2>
        <p>Hello <strong>${query.firstName} ${query.lastName || ""}</strong>,</p>
        <p>We have received your support inquiry. A dedicated concierge specialist has been assigned to your request and will get back to you shortly.</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Ticket ID:</strong> ${ticketId}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Your Message:</strong></p>
          <p style="margin: 0; font-size: 13px; color: #555; font-style: italic;">"${query.message}"</p>
        </div>
        
        <p>We aim to resolve all inquiries within 24 hours. You will receive an email notification as soon as our staff updates your ticket.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; text-align: center; color: #999; margin: 0;">Samay Watch Concierge Services</p>
      </div>
    `;

    await transporter.sendMail({
      from: senderEmail,
      to: customerEmail,
      subject: `Support Ticket Raised - ${ticketId}`,
      html: htmlContent
    });

    console.log(`✉️ Support ticket raised email sent to ${customerEmail}`);
  } catch (error) {
    console.error("❌ Failed to send support ticket raised email:", error.message);
  }
};

// 3. Send Support Ticket Reply/Update Email
exports.sendTicketUpdateNotification = async (query, updateMessage) => {
  try {
    const transporter = getTransporter();
    const customerEmail = query.email;
    if (!customerEmail) return;

    const ticketId = `#TKT-${query._id.toString().slice(-6).toUpperCase()}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
          <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Concierge</p>
        </div>
        
        <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; text-align: center;">Support Ticket Updated</h2>
        <p>Hello <strong>${query.firstName} ${query.lastName || ""}</strong>,</p>
        <p>Our concierge staff has posted an update to your support ticket <strong>${ticketId}</strong>:</p>
        
        <div style="background: #f4fdf9; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #d1f2e5; box-shadow: 0 4px 12px rgba(0,0,0,0.01);">
          <p style="margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #008060; font-weight: bold;">Concierge Staff Response:</p>
          <p style="margin: 0; font-size: 14px; color: #111; font-weight: 550; white-space: pre-line;">${updateMessage}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px solid #eee; font-size: 12px;">
          <p style="margin: 0 0 4px 0; color: #777;"><strong>Original Inquiry:</strong></p>
          <p style="margin: 0; color: #555; font-style: italic;">"${query.message}"</p>
        </div>
        
        <p>To reply to this update, simply reply directly to this email.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; text-align: center; color: #999; margin: 0;">Samay Watch Concierge Services</p>
      </div>
    `;

    await transporter.sendMail({
      from: senderEmail,
      to: customerEmail,
      subject: `[Update] Support Ticket ${ticketId}`,
      html: htmlContent
    });

    console.log(`✉️ Support ticket update email sent to ${customerEmail}`);
  } catch (error) {
    console.error("❌ Failed to send support ticket update email:", error.message);
  }
};

// 4. Send Back-in-Stock Notification Email
exports.sendBackInStockNotification = async (email, userName, product) => {
  try {
    const transporter = getTransporter();
    if (!email) return;

    const brandName = product.brand || "Premium";
    const watchTitle = product.title || "Timepiece";
    const subject = `⚡ Back in Stock: The ${brandName} ${watchTitle} is available now!`;

    // Construct the storefront URL
    const baseUrl = process.env.STORE_FRONTEND_URL || "https://samaywatch.in";
    const productPath = product.slug ? `/products/${product.slug}` : `/products/${product._id}`;
    const productUrl = `${baseUrl}${productPath}`;

    const rawImage = product.images?.[0] || product.image?.url;
    const imageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url || "https://via.placeholder.com/200";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
          <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">Premium Timepieces</p>
        </div>
        
        <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000; text-align: center;">It's Back in Stock!</h2>
        <p>Hello <strong>${userName || "Valued Customer"}</strong>,</p>
        <p>Great news! The luxury timepiece you were waiting for is back in stock and ready to order. We only have limited inventory, so make sure to secure yours before it sells out again!</p>
        
        <!-- Product Card Block -->
        <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #f0f0f0; text-align: center;">
          <img src="${imageUrl}" style="max-width: 180px; max-height: 180px; object-fit: contain; margin: 0 auto 15px auto; display: block; mix-blend-multiply: true;" alt="${watchTitle}" />
          <p style="margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #b59410; font-weight: bold;">${brandName}</p>
          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #111; font-weight: bold;">${watchTitle}</h3>
          <p style="margin: 0 0 20px 0; font-size: 15px; font-weight: bold; color: #2e7d32;">Price: ₹${product.price?.toLocaleString('en-IN')}</p>
          
          <div style="text-align: center; margin-top: 15px;">
            <a href="${productUrl}" target="_blank" style="background: #000; color: #fff; text-decoration: none; padding: 12px 30px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 6px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">Order Timepiece Now</a>
          </div>
        </div>
        
        <p style="font-size: 13px; color: #666; text-align: center; margin-top: 20px;">If you have any questions or need custom assistance, feel free to reply directly to this email.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; text-align: center; color: #999; margin: 0;">Samay Watch Concierge Services</p>
      </div>
    `;

    await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: subject,
      html: htmlContent
    });

    console.log(`✉️ Back-in-stock notification email dispatched successfully to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send back-in-stock notification email:", error.message);
  }
};
