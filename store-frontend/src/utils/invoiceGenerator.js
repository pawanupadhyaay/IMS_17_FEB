/**
 * Client-side High-Fidelity Invoice Generator
 * Mimics the premium retail grid layout of the Bath Alchemy invoice.
 */
export function downloadInvoice(order) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Popup blocker is active. Please allow popups to download your invoice.");
    return;
  }
  
  const subtotal = Number(order.subtotal) || Number(order.amount) || 0;
  const discount = Number(order.discount) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const cgst = Number((afterDiscount * 0.025).toFixed(2));
  const sgst = Number((afterDiscount * 0.025).toFixed(2));
  const totalPaid = order.amount || (afterDiscount + cgst + sgst);
  
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <img src="${item.image || (item.product && item.product.images && item.product.images[0]) || 'https://via.placeholder.com/60'}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" alt="Product Image" />
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; font-weight: bold; color: #111827;">
        ${item.title || item.name}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; color: #4b5563;">
        ${(item.product && item.product.brand) || 'Watch'}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; color: #4b5563;">
        Watch
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; color: #111827;">
        ₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #111827; font-weight: bold;">
        ${item.qty || item.quantity || 1}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: bold; color: #111827;">
        ₹${(Number(item.price) * (item.qty || item.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  const shipping = order.shippingAddress || {};

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderId}</title>
      <meta charset="utf-8" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body {
          font-family: 'Inter', Arial, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 40px;
          background-color: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
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
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr;
          gap: 24px;
          margin-bottom: 45px;
          font-size: 12px;
          line-height: 1.6;
        }
        .meta-title {
          font-weight: 900;
          text-transform: uppercase;
          font-size: 11px;
          color: #111827;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .meta-block {
          color: #374151;
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
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
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
            <strong>Samay Watch</strong><br/>
            GSTIN - 07AANFS0947D1Z5<br/>
            Main Market, Bada Gol Chakkar,<br/>
            10-F, Near Sparks Mall, Kamla Nagar,<br/>
            Block F, Kamla Nagar,<br/>
            New Delhi, Delhi - 110007
          </div>
          <div class="meta-block">
            <div class="meta-title">BILL TO:</div>
            <strong>${shipping.fullName || 'Valued Customer'}</strong><br/>
            ${shipping.addressLine1 || ''}<br/>
            ${shipping.addressLine2 ? shipping.addressLine2 + '<br/>' : ''}
            ${shipping.city || ''} - ${shipping.pincode || ''}<br/>
            ${shipping.state || ''}<br/>
            India
          </div>
          <div class="meta-block">
            <div class="meta-title">SHIP TO:</div>
            <strong>${shipping.fullName || 'Valued Customer'}</strong><br/>
            ${shipping.addressLine1 || ''}<br/>
            ${shipping.addressLine2 ? shipping.addressLine2 + '<br/>' : ''}
            ${shipping.city || ''} - ${shipping.pincode || ''}<br/>
            ${shipping.state || ''}<br/>
            India
          </div>
          <div class="meta-block">
            <div class="meta-title">Invoice #:</div>
            ${order.orderId}<br/><br/>
            <div class="meta-title">Invoice Date:</div>
            ${order.date}
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 10%; text-align: center; padding-left: 10px; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">Image</th>
                <th style="width: 30%; text-align: left;">Description</th>
                <th style="width: 15%; text-align: left;">Brand</th>
                <th style="width: 10%; text-align: left;">Category</th>
                <th style="width: 15%; text-align: right;">Rate/Item</th>
                <th style="width: 10%; text-align: center;">Quantity</th>
                <th style="width: 10%; text-align: right; padding-right: 10px; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Total</th>
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
            ${discount > 0 ? `
            <tr>
              <td style="text-align: left; color: #4b5563;">Discount</td>
              <td style="text-align: right; font-weight: bold; color: #dc2626;">- ₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="text-align: left; color: #4b5563;">After Discount</td>
              <td style="text-align: right; font-weight: bold; color: #111827;">₹${afterDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="text-align: left; color: #4b5563;">CGST 2.5%</td>
              <td style="text-align: right; color: #374151;">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="text-align: left; color: #4b5563;">SGST 2.5%</td>
              <td style="text-align: right; color: #374151;">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr class="total-row">
              <td style="text-align: left;">Total INR</td>
              <td style="text-align: right;">₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <strong>Samay Watch</strong> (GSTIN - 07AANFS0947D1Z5)<br/>
          Main Market, Bada Gol Chakkar, 10-F, Near Sparks Mall, Kamla Nagar, Block F, Kamla Nagar, New Delhi, Delhi - 110007
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
