import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

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

  const rows = order.products.map((product, i) => {
    const amount = product.rate * product.quantity;
    const discountAmount = amount * (product.discount / 100);
    const lineAmount = amount - discountAmount;
    subTotal += lineAmount;
    totalQuantity += product.quantity;

    const taxRate = product.tax_rate || 0;
    if (!taxBreakdown[taxRate]) taxBreakdown[taxRate] = 0;
    taxBreakdown[taxRate] += lineAmount;

    return `
    <tr>
        <td align="center">${i + 1}</td>
        <td>${product.name}</td>
        <td align="center">${product.hsn_sac || ""}</td>
        <td align="right">${product.quantity.toFixed(2)}</td>
        <td align="right">${product.rate.toFixed(2)}</td>
        <td align="center">${product.unit}</td>
        <td align="right">${product.discount > 0 ? product.discount.toFixed(2) : "0.00"}</td>
        <td align="right"><b>${lineAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
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
<td colspan="7" class="right bold">OUTPUT CGST ${halfRate.toFixed(2)}%</td>
<td class="right">${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>

<tr>
<td colspan="7" class="right bold">OUTPUT SGST ${halfRate.toFixed(2)}%</td>
<td class="right">${halfTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>
      `;
    } else {
      const igst = (taxableAmount * rate) / 100;
      totalTax += igst;
      taxRowsHtml += `
<tr>
<td colspan="7" class="right bold">OUTPUT IGST ${rate.toFixed(0)}%</td>
<td class="right">${igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>
      `;
    }
  }

  const freight = order.freightExpense || 0;
  let freightRowHtml = "";
  if (freight > 0) {
    freightRowHtml = `
<tr>
<td colspan="7" class="right bold">Freight Expense</td>
<td class="right">${freight.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>
    `;
  }

  const totalBeforeRound = subTotal + freight + totalTax;
  const finalTotal = Math.round(totalBeforeRound);
  const roundOff = finalTotal - totalBeforeRound;
  const amountWords = numberToWords(finalTotal);
  const defaultUnit = order.products[0]?.unit || "Box";

  const logoHtml = company.logo_url
    ? `<img src="${company.logo_url}" width="70" crossorigin="anonymous"><br>`
    : "";

  const signatureHtml = company.authorized_signature_url
    ? `<img src="${company.authorized_signature_url}" width="120" style="margin: 8px 0;" crossorigin="anonymous">`
    : `<br><br>`;

  const customerGstHtml = order.custGstNumber
    ? `<br>GSTIN: ${order.custGstNumber}`
    : "";

  // Watermark: CSS ::before won't render in html2canvas, so we use an inline overlay div
  const watermarkUrl = company.pdf_background_url || "https://i.ibb.co/0RJFHGhh/1755585947227-nandi.jpg";
  const watermarkHtml = `<div style="position: absolute; inset: 0; background-image: url('${watermarkUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; opacity: 0.08; z-index: 0; pointer-events: none;"></div>`;

  return `
<html>
<head>
<style>
body {
    font-family: Arial;
    font-size: 12px;
}

.outer {
    width: 900px;
    margin:auto;
    border:2px solid black;
    padding:0;
    position: relative;
}

.outer > * {
    position: relative;
    z-index: 1;
}

table {
    width:100%;
    border-collapse: collapse;
}

td, th {
    border:1px solid black;
    padding:5px;
}

.header-title {
    text-align:center;
    font-size:18px;
    font-weight:bold;
    padding:8px;
    border-bottom:1px solid black;
}

.right { text-align:right; }
.center { text-align:center; }
.bold { font-weight:bold; }

</style>
</head>

<body>

<div class="outer">

${watermarkHtml}

<div class="header-title">SALES &nbsp; ORDER</div>

<table>
<tr>
<td width="60%" style="vertical-align:top;">
${logoHtml}
<b>${company.name}</b><br>
${company.address}<br>
GSTIN/UIN: ${company.gstin}<br>
State Name: ${company.state}${companyStateCode ? `, Code : ${companyStateCode}` : ""}
</td>

<td width="40%" style="padding:0;">
<table>
<tr><td><b>Voucher No.</b></td><td class="right bold">${voucherNo}</td></tr>
<tr><td><b>Dated</b></td><td class="right bold">${orderDate}</td></tr>
<tr><td><b>Buyer's Ref./Order No.</b></td><td class="right">${voucherNo}</td></tr>
<tr><td>Mode/Terms of Payment</td><td></td></tr>
<tr><td>Other References</td><td></td></tr>
<tr><td>Dispatched through</td><td></td></tr>
<tr><td>Destination</td><td></td></tr>
<tr><td>Terms of Delivery</td><td></td></tr>
</table>
</td>
</tr>
</table>

<table>
<tr>
<td width="50%">
<b>Consignee (Ship to)</b><br>
${order.customerName}<br>
${order.shippingAddress}<br>
State Name: ${order.customerState}${custStateCode ? `, Code : ${custStateCode}` : ""}<br>
Contact: ${order.contactNumber}${customerGstHtml}
</td>

<td width="50%">
<b>Buyer (Bill to)</b><br>
${order.customerName}<br>
${order.shippingAddress}<br>
State Name: ${order.customerState}${custStateCode ? `, Code : ${custStateCode}` : ""}<br>
Contact: ${order.contactNumber}${customerGstHtml}
</td>
</tr>
</table>

<table>
<tr>
<th width="5%">Sl</th>
<th width="35%">Description</th>
<th width="10%">HSN</th>
<th width="10%">Qty</th>
<th width="10%">Rate</th>
<th width="5%">Per</th>
<th width="10%">Disc%</th>
<th width="15%">Amount</th>
</tr>

${rows}

<tr>
<td colspan="7" class="right bold">Sub Total</td>
<td class="right bold">${subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>

${freightRowHtml}

${taxRowsHtml}

<tr>
<td colspan="7" class="right bold">Round Off</td>
<td class="right">${roundOff.toFixed(2)}</td>
</tr>

<tr>
<td colspan="4" class="bold">Total</td>
<td colspan="3" class="center bold">${totalQuantity.toFixed(2)} ${defaultUnit}</td>
<td class="right bold">₹ ${finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
</tr>

</table>

<table>
<tr>
<td width="70%">
<b>Amount Chargeable (in words)</b><br>
INR ${amountWords} Only
</td>
<td width="30%" class="right">
E. & O.E
</td>
</tr>
</table>

<table>
<tr>
<td width="60%">
<b>Company's Bank Details</b><br>
A/c Holder's Name: <b>${company.bank_account_holder}</b><br>
Bank Name: <b>${company.bank_name}</b><br>
A/c No.: <b>${company.bank_account_no}</b><br>
Branch & IFS Code: <b>${company.bank_ifsc}</b>
</td>

<td width="40%" class="right" style="vertical-align:bottom;">
<b>for ${company.name}</b><br>
${signatureHtml}
Authorised Signatory
</td>
</tr>
</table>

<div style="text-align:center; font-size:10px; padding:5px;">
This is a Computer Generated Document
</div>

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
  container.style.width = "950px";
  document.body.appendChild(container);

  const element = container.querySelector(".outer") || container;

  const opt = {
    margin: [2, 2, 2, 2],
    filename: `SalesOrder_${order.customerName.replace(/\s+/g, "_")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, width: 920, windowWidth: 950 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };

  const pdfBlob: Blob = await html2pdf().set(opt).from(element).outputPdf("blob");
  document.body.removeChild(container);

  // Upload PDF to Supabase storage
  const storagePath = await uploadPdfToStorage(pdfBlob, order.customerName, order.voucherNumber);

  // If upload succeeded, return the public URL; otherwise fall back to blob URL
  if (storagePath) {
    const { data: urlData } = supabase.storage.from("company_assets").getPublicUrl(storagePath);
    if (urlData?.publicUrl) {
      return urlData.publicUrl;
    }
  }

  // Fallback to local blob URL
  return URL.createObjectURL(pdfBlob);
}

async function uploadPdfToStorage(blob: Blob, customerName: string, voucherNumber?: string): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const safeName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `sales_orders/${safeName}_${timestamp}.pdf`;

    const { data, error } = await supabase.storage
      .from("company_assets")
      .upload(fileName, blob, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error("PDF upload error:", error);
      return null;
    }

    return data.path;
  } catch (err) {
    console.error("PDF upload failed:", err);
    return null;
  }
}
