import html2pdf from "html2pdf.js";

const INDIAN_STATE_CODES: Record<string, string> = {
  "Andhra Pradesh": "37", "Arunachal Pradesh": "12", "Assam": "18", "Bihar": "10",
  "Chhattisgarh": "22", "Delhi": "07", "Goa": "30", "Gujarat": "24",
  "Haryana": "06", "Himachal Pradesh": "02", "Jharkhand": "20", "Karnataka": "29",
  "Kerala": "32", "Madhya Pradesh": "23", "Maharashtra": "27", "Manipur": "14",
  "Meghalaya": "17", "Mizoram": "15", "Nagaland": "13", "Odisha": "21",
  "Punjab": "03", "Rajasthan": "08", "Sikkim": "11", "Tamil Nadu": "33",
  "Telangana": "36", "Tripura": "16", "Uttar Pradesh": "09", "Uttarakhand": "05",
  "West Bengal": "19", "Jammu and Kashmir": "01", "Ladakh": "38",
  "Chandigarh": "04", "Puducherry": "34", "Lakshadweep": "31",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Andaman and Nicobar Islands": "35",
};

function getStateCode(stateName: string): string {
  if (!stateName) return "";
  const normalized = stateName.trim();
  for (const [key, code] of Object.entries(INDIAN_STATE_CODES)) {
    if (key.toLowerCase() === normalized.toLowerCase()) return code;
  }
  return "";
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  return convert(Math.round(num));
}

export interface PdfProduct {
  name: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  unit: string;
  discount: number;
  tax_rate: number;
}

export interface PdfCompanyData {
  name: string;
  address: string;
  gstin: string;
  state: string;
  bank_account_holder: string;
  bank_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  logo_url?: string | null;
  authorized_signature_url?: string | null;
  payment_qr_url?: string | null;
  pdf_background_url?: string | null;
}

export interface PdfOrderData {
  customerName: string;
  shippingAddress: string;
  customerState: string;
  contactNumber: string;
  custGstNumber?: string | null;
  freightExpense: number;
  products: PdfProduct[];
  voucherNumber?: string;
  orderDate?: string;
}

function buildHtml(company: PdfCompanyData, order: PdfOrderData): string {
  const companyStateCode = getStateCode(company.state);
  const custStateCode = getStateCode(order.customerState);
  const voucherNo = order.voucherNumber || `SO/${Date.now().toString().slice(-6)}`;
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  const isSameState = company.state?.toLowerCase().trim() === order.customerState?.toLowerCase().trim();

  let subTotal = 0;
  let totalQuantity = 0;
  const taxBreakdown: Record<number, number> = {};

  const itemRowsHtml = order.products.map((product, i) => {
    const baseAmount = product.rate * product.quantity;
    const discountAmount = baseAmount * (product.discount / 100);
    const lineAmount = baseAmount - discountAmount;
    subTotal += lineAmount;
    totalQuantity += product.quantity;

    const taxRate = product.tax_rate || 0;
    if (!taxBreakdown[taxRate]) taxBreakdown[taxRate] = 0;
    taxBreakdown[taxRate] += lineAmount;

    return `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td style="font-weight: bold;">${product.name}</td>
        <td>${product.hsn_sac || ""}</td>
        <td>${orderDate}</td>
        <td class="text-right"><strong>${product.quantity.toFixed(2)}</strong> ${product.unit}</td>
        <td class="text-right">${product.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${product.unit}</td>
        <td class="text-right">${product.discount > 0 ? product.discount.toFixed(2) : "0.00"}</td>
        <td class="text-right"><strong>${lineAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      </tr>
    `;
  }).join("");

  // Tax rows
  let totalTax = 0;
  let taxRowsHtml = "";

  for (const [rateStr, taxableAmount] of Object.entries(taxBreakdown)) {
    const rate = parseFloat(rateStr);
    if (rate <= 0) continue;

    if (isSameState) {
      const halfRate = rate / 2;
      const halfTax = (taxableAmount * halfRate) / 100;
      totalTax += halfTax * 2;
      taxRowsHtml += `
        <tr>
          <td colspan="8" class="text-right bold">OUTPUT CGST ${halfRate.toFixed(2)}%</td>
          <td class="text-right bold">${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td colspan="8" class="text-right bold">OUTPUT SGST ${halfRate.toFixed(2)}%</td>
          <td class="text-right bold">${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else {
      const igst = (taxableAmount * rate) / 100;
      totalTax += igst;
      taxRowsHtml += `
        <tr>
          <td colspan="8" class="text-right bold">OUTPUT IGST ${rate.toFixed(0)}%</td>
          <td class="text-right bold">${igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    }
  }

  const freightExpense = order.freightExpense || 0;
  let freightRowHtml = "";
  if (freightExpense > 0) {
    freightRowHtml = `
      <tr>
        <td colspan="8" class="text-right bold">Freight Expense</td>
        <td class="text-right bold">${freightExpense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  const grandTotalRaw = subTotal + freightExpense + totalTax;
  const grandTotal = Math.round(grandTotalRaw);
  const roundOff = grandTotal - grandTotalRaw;
  const amountInWords = numberToWords(grandTotal);
  const defaultUnit = order.products[0]?.unit || "Box";

  const watermarkHtml = company.pdf_background_url
    ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none;">
        <img src="${company.pdf_background_url}" alt="Watermark" style="width: 400px; height: auto;" crossorigin="anonymous">
      </div>`
    : "";

  const logoHtml = company.logo_url
    ? `<div style="padding-right: 15px;"><img src="${company.logo_url}" alt="Company Logo" style="width: 70px; height: auto;" crossorigin="anonymous"></div>`
    : "";

  const signatureHtml = company.authorized_signature_url
    ? `<img src="${company.authorized_signature_url}" alt="Signature" style="width: 120px; height: auto; margin: 8px 0;" crossorigin="anonymous">`
    : `<br><br><br>`;

  const customerGstHtml = order.custGstNumber
    ? `<br><span class="bold">GSTIN:</span> ${order.custGstNumber}`
    : "";

  return `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10.5px; color: #000; margin: 0; padding: 0; }
    .container { width: 750px; margin: auto; border: 1px solid #000; padding: 5px; position: relative; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td, th { padding: 4px; vertical-align: top; word-wrap: break-word; overflow: hidden; }
    .bordered, .bordered td, .bordered th { border: 1px solid #000; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .items-table td { padding-top: 6px; padding-bottom: 6px; }
  </style>
</head>
<body>
<div class="container">
  ${watermarkHtml}
  <h3 class="text-center" style="font-size: 16px; margin: 5px 0;">SALES ORDER</h3>

  <table class="bordered">
    <tr>
      <td style="width: 55%;" rowspan="2">
        <div style="display: flex; align-items: center;">
          ${logoHtml}
          <div>
            <span class="bold" style="font-size: 14px;">${company.name}</span><br>
            ${company.address}<br>
            <span class="bold">GSTIN/UIN:</span> ${company.gstin}<br>
            <span class="bold">State Name:</span> ${company.state}${companyStateCode ? `, Code : ${companyStateCode}` : ""}
          </div>
        </div>
      </td>
      <td style="width: 45%;">
        <table class="bordered">
          <tr><td>Voucher No.</td><td class="bold">${voucherNo}</td></tr>
          <tr><td>Dated</td><td class="bold">${orderDate}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table class="bordered">
          <tr><td>Buyer's Ref./Order No.</td><td class="bold">${voucherNo}</td></tr>
          <tr><td>Mode/Terms of Payment</td><td></td></tr>
          <tr><td>Other References</td><td></td></tr>
          <tr><td>Dispatched through</td><td></td></tr>
          <tr><td>Destination</td><td></td></tr>
          <tr><td style="height: 40px;">Terms of Delivery</td><td></td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Address Section -->
  <table class="bordered" style="margin-top: 5px;">
    <tr>
      <td style="width: 50%;">
        <span class="bold">Consignee (Ship to)</span><br>
        <span class="bold" style="font-size: 13px;">${order.customerName}</span><br>
        ${order.shippingAddress}<br>
        <span class="bold">State Name:</span> ${order.customerState}${custStateCode ? `, Code : ${custStateCode}` : ""}<br>
        <span class="bold">Contact:</span> ${order.contactNumber}${customerGstHtml}
      </td>
      <td style="width: 50%;">
        <span class="bold">Buyer (Bill to)</span><br>
        <span class="bold" style="font-size: 13px;">${order.customerName}</span><br>
        ${order.shippingAddress}<br>
        <span class="bold">State Name:</span> ${order.customerState}${custStateCode ? `, Code : ${custStateCode}` : ""}<br>
        <span class="bold">Contact:</span> ${order.contactNumber}${customerGstHtml}
      </td>
    </tr>
  </table>

  <!-- Items Table -->
  <table class="bordered items-table" style="margin-top: 5px;">
    <thead>
      <tr>
        <th class="text-center">Sl No.</th>
        <th>Description of Goods</th>
        <th>HSN/SAC</th>
        <th style="width: 70px;">Due on</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Rate</th>
        <th>per</th>
        <th class="text-right">Disc. %</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
      <tr>
        <td colspan="8" class="text-right bold">Sub Total</td>
        <td class="text-right bold">${subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      ${freightRowHtml}
      ${taxRowsHtml}
      <tr>
        <td colspan="8" class="text-right bold">Round Off</td>
        <td class="text-right bold">${roundOff.toFixed(2)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="bold">
        <td colspan="4" class="text-center">Total</td>
        <td class="text-right">${totalQuantity.toFixed(2)} ${defaultUnit}</td>
        <td colspan="3"></td>
        <td class="text-right" style="font-size: 14px;">₹ ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Amount in Words -->
  <table class="bordered" style="margin-top: 5px;">
    <tr>
      <td>Amount Chargeable (in words)<br><span class="bold text-center" style="display: block; margin-top: 5px;">INR ${amountInWords} Only</span></td>
      <td class="text-right" style="width: 20%;">E. & O.E</td>
    </tr>
  </table>

  <!-- Bank Details & Signature -->
  <table style="margin-top: 5px;">
    <tr>
      <td style="width: 50%;">
        <span class="bold">Company's Bank Details</span><br>
        A/c Holder's Name: <span class="bold">${company.bank_account_holder}</span><br>
        Bank Name: <span class="bold">${company.bank_name}</span><br>
        A/c No.: <span class="bold">${company.bank_account_no}</span><br>
        Branch & IFS Code: <span class="bold">${company.bank_ifsc}</span>
      </td>
      <td style="width: 50%; vertical-align: bottom; text-align: right;">
        <span class="bold">for ${company.name}</span><br>
        ${signatureHtml}
        Authorised Signatory
      </td>
    </tr>
    <tr>
      <td colspan="2" class="text-center" style="font-size: 9px; padding-top: 15px;">This is a Computer Generated Document</td>
    </tr>
  </table>
</div>
</body>
</html>
  `;
}

export async function generateSalesOrderPdf(
  company: PdfCompanyData,
  order: PdfOrderData
): Promise<string> {
  const htmlContent = buildHtml(company, order);

  // Create a temporary container
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  document.body.appendChild(container);

  const element = container.querySelector(".container") || container;

  const opt = {
    margin: [2, 2, 2, 2],
    filename: `SalesOrder_${order.customerName.replace(/\s+/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, width: 760, windowWidth: 800 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };

  const pdfBlob: Blob = await html2pdf().set(opt).from(element).outputPdf("blob");
  document.body.removeChild(container);

  const blobUrl = URL.createObjectURL(pdfBlob);
  return blobUrl;
}
