import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const rounded = Math.round(num);
  return convert(rounded);
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

function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateSalesOrderPdf(
  company: PdfCompanyData,
  order: PdfOrderData
): Promise<string> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Load images
  const [logoBase64, signatureBase64] = await Promise.all([
    company.logo_url ? loadImageAsBase64(company.logo_url) : Promise.resolve(null),
    company.authorized_signature_url ? loadImageAsBase64(company.authorized_signature_url) : Promise.resolve(null),
  ]);

  // === HEADER ===
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SALES ORDER", pageWidth / 2, y + 6, { align: "center" });
  y += 12;

  // Company name
  doc.setFontSize(12);
  doc.text(company.name, pageWidth / 2, y + 5, { align: "center" });
  y += 10;

  // Logo (top-left if available)
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", margin, margin, 25, 25); } catch { /* ignore */ }
  }

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // === VOUCHER INFO ===
  const companyStateCode = getStateCode(company.state);
  const voucherNo = order.voucherNumber || `SO/${Date.now().toString().slice(-6)}`;
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const leftCol = margin;
  const rightCol = pageWidth / 2 + 5;

  doc.text(`Voucher No.: ${voucherNo}`, leftCol, y);
  doc.text(`Dated: ${orderDate}`, rightCol, y);
  y += 4;
  doc.text(`GSTIN/UIN: ${company.gstin}`, leftCol, y);
  doc.text(`Buyer's Ref.: ${voucherNo}`, rightCol, y);
  y += 4;
  doc.text(`State: ${company.state}${companyStateCode ? `, Code: ${companyStateCode}` : ""}`, leftCol, y);
  y += 6;

  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // === CONSIGNEE & BUYER ===
  const custStateCode = getStateCode(order.customerState);
  const halfWidth = contentWidth / 2 - 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Consignee (Ship to)", leftCol, y);
  doc.text("Buyer (Bill to)", rightCol, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Consignee
  const consigneeLines = [
    order.customerName,
    order.shippingAddress || "",
    order.customerState ? `State: ${order.customerState}${custStateCode ? `, Code: ${custStateCode}` : ""}` : "",
    order.contactNumber ? `Contact: ${order.contactNumber}` : "",
    order.custGstNumber ? `GSTIN: ${order.custGstNumber}` : "",
  ].filter(Boolean);

  // Buyer (same as consignee)
  const buyerLines = [...consigneeLines];

  const maxLines = Math.max(consigneeLines.length, buyerLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (consigneeLines[i]) doc.text(consigneeLines[i], leftCol, y);
    if (buyerLines[i]) doc.text(buyerLines[i], rightCol, y);
    y += 4;
  }
  y += 2;

  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  // === PRODUCTS TABLE ===
  const isSameState = company.state?.toLowerCase().trim() === order.customerState?.toLowerCase().trim();

  const tableHead = [["Sl No.", "Description of Goods", "HSN/SAC", "Quantity", "Rate per", "Disc. %", "Amount"]];
  const tableBody: (string | number)[][] = [];

  let subTotal = 0;
  let totalQuantity = 0;
  let totalTaxableAmount = 0;
  const taxBreakdown: Record<number, number> = {};

  order.products.forEach((product, index) => {
    const baseAmount = product.rate * product.quantity;
    const discountAmount = baseAmount * (product.discount / 100);
    const lineAmount = baseAmount - discountAmount;
    subTotal += lineAmount;
    totalQuantity += product.quantity;
    totalTaxableAmount += lineAmount;

    const taxRate = product.tax_rate || 0;
    if (!taxBreakdown[taxRate]) taxBreakdown[taxRate] = 0;
    taxBreakdown[taxRate] += lineAmount;

    tableBody.push([
      (index + 1).toString(),
      product.name,
      product.hsn_sac || "",
      product.quantity.toFixed(2),
      `${product.rate.toFixed(2)} ${product.unit}`,
      product.discount > 0 ? product.discount.toFixed(2) : "0.00",
      lineAmount.toFixed(2),
    ]);
  });

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 16, halign: "right" },
      6: { cellWidth: 25, halign: "right" },
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // === TOTALS SECTION ===
  const freightExpense = order.freightExpense || 0;
  let totalTax = 0;

  const summaryX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Sub Total
  doc.text("Sub Total:", summaryX, y);
  doc.text(subTotal.toFixed(2), valueX, y, { align: "right" });
  y += 5;

  // Freight
  if (freightExpense > 0) {
    doc.text("Freight Expense:", summaryX, y);
    doc.text(freightExpense.toFixed(2), valueX, y, { align: "right" });
    y += 5;
  }

  // Tax lines
  for (const [rateStr, taxableAmount] of Object.entries(taxBreakdown)) {
    const rate = parseFloat(rateStr);
    if (rate <= 0) continue;

    if (isSameState) {
      const halfRate = rate / 2;
      const halfTax = (taxableAmount * halfRate) / 100;
      totalTax += halfTax * 2;

      doc.text(`OUTPUT CGST ${halfRate.toFixed(2)}%:`, summaryX, y);
      doc.text(halfTax.toFixed(2), valueX, y, { align: "right" });
      y += 5;

      doc.text(`OUTPUT SGST ${halfRate.toFixed(2)}%:`, summaryX, y);
      doc.text(halfTax.toFixed(2), valueX, y, { align: "right" });
      y += 5;
    } else {
      const igst = (taxableAmount * rate) / 100;
      totalTax += igst;

      doc.text(`OUTPUT IGST ${rate.toFixed(2)}%:`, summaryX, y);
      doc.text(igst.toFixed(2), valueX, y, { align: "right" });
      y += 5;
    }
  }

  // Grand total
  const grandTotalRaw = subTotal + freightExpense + totalTax;
  const grandTotal = Math.round(grandTotalRaw);
  const roundOff = grandTotal - grandTotalRaw;

  doc.text("Round Off:", summaryX, y);
  doc.text(roundOff.toFixed(2), valueX, y, { align: "right" });
  y += 5;

  doc.setLineWidth(0.5);
  doc.line(summaryX, y, valueX, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total: ${totalQuantity.toFixed(2)} ${order.products[0]?.unit || ""}`, summaryX, y);
  doc.text(`₹ ${grandTotal.toLocaleString("en-IN")}.00`, valueX, y, { align: "right" });
  y += 6;

  // Amount in words
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`Amount Chargeable (in words): INR ${numberToWords(grandTotal)} Only`, margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("E. & O.E", margin, y);
  y += 8;

  // === BANK DETAILS ===
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Company's Bank Details", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const bankDetails = [
    `A/c Holder's Name: ${company.bank_account_holder}`,
    `Bank Name: ${company.bank_name}`,
    `A/c No.: ${company.bank_account_no}`,
    `Branch & IFS Code: ${company.bank_ifsc}`,
  ];
  bankDetails.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  y += 4;

  // === SIGNATURE ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`for ${company.name}`, pageWidth - margin, y, { align: "right" });
  y += 2;

  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, "PNG", pageWidth - margin - 35, y, 35, 15);
      y += 17;
    } catch { y += 2; }
  } else {
    y += 15;
  }

  doc.text("Authorised Signatory", pageWidth - margin, y, { align: "right" });
  y += 8;

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("This is a Computer Generated Document", pageWidth / 2, y, { align: "center" });

  // Generate blob URL
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  return blobUrl;
}
