// @ts-ignore - compiled via handlebars-loader
import template from "./template.hbs";
import { normalizeInvoiceTemplateState } from "../../main/invoiceTemplateNormalization";
import "./styles.css";

// Register widgets
import "../../widgets/invoice-status";
import "../../widgets/demo-badge";
import "../../widgets/date-time";
import "../../widgets/markdown-viewer";

// Helper to look up custom fields on the invoice object
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

  HB.registerHelper("getItemCustomField", getItemCustomField);

  HB.registerHelper("addOne", function (v: number) {
    return v + 1;
  });

  // Pad items table to a minimum number of rows
  HB.registerHelper("padRows", function (items: any[], minRows: number, options: any) {
    const currentLen = (items && items.length) || 0;
    if (currentLen >= minRows) return "";
    let accum = "";
    for (let i = currentLen; i < minRows; i++) {
      accum += options.fn({ index: i + 1 });
    }
    return accum;
  });

  // Format currency values in en-IN locale
  HB.registerHelper("formatCurrencyValue", function (value: any) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? value : parsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof value === "number") {
      return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  });

  // Format quantity
  HB.registerHelper("formatQty", function (value: any) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return value;
    return parsed < 10 ? "0" + parsed : String(parsed);
  });
}

registerHelpers();

window.CeresTemplateDataMapper = normalizeInvoiceTemplateState as any;
window.CeresTemplate = template;
