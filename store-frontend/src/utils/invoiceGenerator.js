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
  
  const rawSubtotal = Number(order.subtotal) || Number(order.amount) || 0;
  const rawDiscount = Number(order.discount) || 0;
  const rawAfterDiscount = Math.max(0, rawSubtotal - rawDiscount);

  const taxableSubtotal = Number((rawSubtotal / 1.18).toFixed(2));
  const taxableDiscount = Number((rawDiscount / 1.18).toFixed(2));
  const taxableAfterDiscount = Number((rawAfterDiscount / 1.18).toFixed(2));

  const totalTaxAmount = Number((rawAfterDiscount - taxableAfterDiscount).toFixed(2));
  const cgst = Number((totalTaxAmount / 2).toFixed(2));
  const sgst = Number((totalTaxAmount - cgst).toFixed(2));
  const totalPaid = rawAfterDiscount;
  
  const itemsHtml = (order.items || []).map((item, idx) => {
    const qty = item.qty || item.quantity || 1;
    const itemPrice = Number(item.price) || 0;
    
    // Distribute discount across quantities
    const totalQty = (order.items || []).reduce((acc, it) => acc + (it.qty || it.quantity || 1), 0);
    const unitDiscount = totalQty > 0 ? (rawDiscount / totalQty) : 0;
    
    const taxableUnitPrice = Number((itemPrice / 1.18).toFixed(2));
    const taxableUnitDiscount = Number((unitDiscount / 1.18).toFixed(2));
    const taxableValue = Number(((taxableUnitPrice - taxableUnitDiscount) * qty).toFixed(2));
    
    const itemTax = Number(((itemPrice - unitDiscount) * qty - taxableValue).toFixed(2));
    const itemCgst = Number((itemTax / 2).toFixed(2));
    const itemSgst = Number((itemTax - itemCgst).toFixed(2));
    const itemTotal = Number((taxableValue + itemCgst + itemSgst).toFixed(2));
    
    const hsn = item.product?.hsn || '9102';
    let sku = item.variantSku || item.product?.sku || item.sku || '';
    if (!sku || sku === 'N/A') {
      const title = item.title || item.name || '';
      const match = title.match(/^([A-Za-z0-9-]*\d[A-Za-z0-9-]*)(?:\s|$)/);
      sku = (match && match[1] && match[1].length >= 4) ? match[1] : 'N/A';
    }
    if (sku && sku !== 'N/A') {
      sku = sku.replace(/-gwp$/i, '');
    }
    
    return `
      <tr>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #4b5563;">
          ${idx + 1}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; color: #111827;">
          <div style="font-weight: bold; margin-bottom: 4px;">${item.title || item.name}</div>
          <div style="font-size: 10px; color: #6b7280;">SKU : ${sku}</div>
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #4b5563;">
          ${hsn}
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px; font-weight: bold; color: #111827;">
          ${qty}
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; color: #111827;">
          ₹${taxableUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; color: #4b5563;">
          ₹${taxableUnitDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; color: #111827;">
          ₹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #374151;">
          ₹${itemCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span style="color: #9ca3af;">| 9%</span>
        </td>
        <td style="padding: 12px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #374151;">
          ₹${itemSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span style="color: #9ca3af;">| 9%</span>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; font-weight: bold; color: #111827;">
          ₹${itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }).join('');

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
                <th style="width: 4%; text-align: center; padding-left: 10px; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">S.No.</th>
                <th style="width: 24%; text-align: left;">Product Name</th>
                <th style="width: 7%; text-align: center;">HSN</th>
                <th style="width: 5%; text-align: center;">Qty</th>
                <th style="width: 10%; text-align: right;">Unit Price</th>
                <th style="width: 10%; text-align: right;">Unit Discount</th>
                <th style="width: 10%; text-align: right;">Taxable Value</th>
                <th style="width: 10%; text-align: center;">CGST (Value | %)</th>
                <th style="width: 10%; text-align: center;">SGST (Value | %)</th>
                <th style="width: 10%; text-align: right; padding-right: 10px; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; border-top: 2px solid #e5e7eb; border-bottom: 2px solid #111827;">
                <td colspan="7" style="padding: 12px 6px; text-align: right; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                  NET TOTAL (In Value)
                </td>
                <td colspan="3" style="padding: 12px 10px; text-align: right; font-size: 13px; font-weight: 900; color: #111827;">
                  ₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30px; margin-bottom: 30px;">
          <!-- Left: Signature Box -->
          <div style="width: 240px; text-align: left;">
            <div style="border: 1px solid #d1d5db; height: 60px; background-color: #fafafa; border-radius: 4px; margin-bottom: 8px;"></div>
            <div style="font-size: 11px; font-weight: 600; color: #374151; line-height: 1.4;">
              Authorized Signature for<br/>
              <span style="font-size: 12px; font-weight: 900; color: #111827; letter-spacing: 0.5px;">SAMAY</span>
            </div>
          </div>
          
          <!-- Right: Reverse Charge -->
          <div style="text-align: right; min-width: 280px;">
            <div style="font-size: 12px; color: #374151; font-weight: 600;">
              Whether tax is payable under reverse charge- <span style="font-weight: 900; color: #111827;">No</span>
            </div>
          </div>
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
