// @ts-ignore - compiled via handlebars-loader
import template from "./template.hbs";
import { normalizeInvoiceTemplateState } from "../../main/invoiceTemplateNormalization";
import "./styles.css";

// Register widgets
import "../../widgets/invoice-status";
import "../../widgets/demo-badge";
import "../../widgets/date-time";
import "../../widgets/markdown-viewer";

function getItemCustomField(item: any, label: string): string {
  if (!item) return "";
  if (item.custom && item.custom[label] !== undefined && item.custom[label] !== null) {
    return String(item.custom[label]);
  }
  if (item.customFields && Array.isArray(item.customFields)) {
    const f = item.customFields.find(
      (cf: any) => cf && cf.label && cf.label.toLowerCase() === label.toLowerCase()
    );
    if (f && f.value !== undefined && f.value !== null) {
      return String(f.value);
    }
  }
  return "";
}

function registerHelpers() {
  const HB = (window as any).Handlebars;
  if (!HB) {
    setTimeout(registerHelpers, 50);
    return;
  }

  HB.registerHelper("sagaGetCustomField", getItemCustomField);

  HB.registerHelper("sagaAddOne", function (v: number) {
    return v + 1;
  });

  // Format currency without symbol
  HB.registerHelper("sagaFormatCurrency", function (value: any) {
    if (value === undefined || value === null || value === "") return "-";
    const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : String(value);
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return value;
    return parsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  // Format quantity
  HB.registerHelper("sagaFormatQty", function (value: any) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return value ?? "-";
    return parsed < 10 ? "0" + parsed : String(parsed);
  });

  // Half a tax rate (total GST / 2 = CGST = SGST)
  HB.registerHelper("sagaHalfRate", function (tax: any) {
    const n = parseFloat(String(tax));
    if (isNaN(n)) return "-";
    return (n / 2).toFixed(0);
  });

  // Ensure a value is always an array (handles single object or array)
  HB.registerHelper("sagaEnsureArray", function (val: any, options: any) {
    if (!val) return options.fn([]);
    const arr = Array.isArray(val) ? val : [val];
    return arr.map((item: any) => options.fn(item)).join("");
  });

  // Sum two numeric-ish values
  HB.registerHelper("sagaSum", function (a: any, b: any) {
    const na = parseFloat(String(a).replace(/[^\d.-]/g, "")) || 0;
    const nb = parseFloat(String(b).replace(/[^\d.-]/g, "")) || 0;
    return (na + nb).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  // Item total = amount + igst (or amount if igst absent)
  HB.registerHelper("sagaItemTotal", function (amount: any, igst: any) {
    const na = parseFloat(String(amount).replace(/[^\d.-]/g, "")) || 0;
    const nb = parseFloat(String(igst).replace(/[^\d.-]/g, "")) || 0;
    const total = na + nb;
    return total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  // Pad rows helper
  HB.registerHelper("sagaPadRows", function (items: any[], minRows: number, options: any) {
    const currentLen = (items && items.length) || 0;
    if (currentLen >= minRows) return "";
    let accum = "";
    for (let i = currentLen; i < minRows; i++) {
      accum += options.fn({ index: i + 1 });
    }
    return accum;
  });

  // Authorised signatory label
  HB.registerHelper("sagaSignLabel", function () {
    return "Authorised Signatory";
  });
}

registerHelpers();

window.CeresTemplateDataMapper = normalizeInvoiceTemplateState as any;
window.CeresTemplate = template;
