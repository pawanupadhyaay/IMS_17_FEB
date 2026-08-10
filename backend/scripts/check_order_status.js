const mongoose = require('mongoose');
const Razorpay = require('razorpay');
require('dotenv').config();

async function checkOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Order = require('../models/Order');
    
    const orderDoc = await Order.findOne({
      $or: [
        { orderId: 'ORD-8CBE02' },
        { orderId: '#ORD-8CBE02' },
        { razorpayOrderId: 'order_TNbO40liT3clRn' }
      ]
    });

    console.log('=== MONGO DB RECORD ===');
    if (orderDoc) {
      console.log('ID:', orderDoc._id);
      console.log('OrderId:', orderDoc.orderId);
      console.log('Customer Name:', orderDoc.customer?.name);
      console.log('Customer Email:', orderDoc.customer?.email);
      console.log('Customer Phone:', orderDoc.customer?.phone);
      console.log('Payment Status in DB:', orderDoc.paymentStatus);
      console.log('Order Status in DB:', orderDoc.status);
      console.log('Razorpay Order ID:', orderDoc.razorpayOrderId);
      console.log('Razorpay Payment ID:', orderDoc.razorpayPaymentId);
      console.log('Total Amount:', orderDoc.total);
      console.log('Created At:', orderDoc.createdAt);
    } else {
      console.log('❌ Order not found in MongoDB by ORD-8CBE02 or order_TNbO40liT3clRn');
    }

    console.log('\n=== RAZORPAY LIVE API CHECK ===');
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const rzpOrder = await razorpay.orders.fetch('order_TNbO40liT3clRn');
      console.log('Razorpay Order Details:', {
        id: rzpOrder.id,
        amount: rzpOrder.amount / 100,
        amount_paid: rzpOrder.amount_paid / 100,
        amount_due: rzpOrder.amount_due / 100,
        status: rzpOrder.status,
        attempts: rzpOrder.attempts,
        created_at: new Date(rzpOrder.created_at * 1000).toLocaleString()
      });

      const payments = await razorpay.orders.fetchPayments('order_TNbO40liT3clRn');
      console.log('Total Payment Attempts on Razorpay:', payments.count);
      if (payments.items && payments.items.length > 0) {
        payments.items.forEach((p, idx) => {
          console.log(`Payment #${idx + 1}:`, {
            id: p.id,
            status: p.status,
            method: p.method,
            amount: p.amount / 100,
            email: p.email,
            contact: p.contact,
            error_code: p.error_code,
            error_description: p.error_description,
            created_at: new Date(p.created_at * 1000).toLocaleString()
          });
        });
      } else {
        console.log('⚠️ No payment attempt recorded on Razorpay for this order.');
      }
    } else {
      console.log('❌ Razorpay credentials missing in .env');
    }
  } catch (err) {
    console.error('❌ Error during check:', err);
  } finally {
    process.exit(0);
  }
}

checkOrder();
