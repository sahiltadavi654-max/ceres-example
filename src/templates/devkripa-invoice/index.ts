// @ts-ignore - compiled via handlebars-loader
import template from "./template.hbs";
import { normalizeInvoiceTemplateState } from "../../main/invoiceTemplateNormalization";
import "./styles.css";

// Register widgets (ensures partials and styles are available)
import "../../widgets/invoice-status";
import "../../widgets/demo-badge";
import "../../widgets/date-time";
import "../../widgets/markdown-viewer";

// Helper to look up custom fields on items
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

function getItemMtr(item: any): string {
  if (!item) return "";
  const customMtr = getItemCustomField(item, "MTR") || getItemCustomField(item, "mtr");
  if (customMtr !== "") {
    const parsed = parseFloat(customMtr);
    return isNaN(parsed) ? "" : parsed.toFixed(2);
  }
  // Fallback to unit/quantity
  if (item.unit && item.unit.toUpperCase() === "MTR") {
    return parseFloat(item.quantity || 0).toFixed(2);
  }
  return parseFloat(item.quantity || 0).toFixed(2);
}

function getItemFoldLess(item: any): string {
  if (!item) return "0.00";
  const customFold =
    getItemCustomField(item, "Fold Less %") ||
    getItemCustomField(item, "Fold Less") ||
    getItemCustomField(item, "fold_less") ||
    getItemCustomField(item, "foldLess");
  if (customFold !== "") {
    const parsed = parseFloat(customFold);
    return isNaN(parsed) ? "0.00" : parsed.toFixed(2);
  }
  return "0.00";
}

function getItemNetMtr(item: any): string {
  if (!item) return "";
  const mtr = parseFloat(getItemMtr(item));
  const fold = parseFloat(getItemFoldLess(item));
  if (isNaN(mtr)) return "";
  const netMtr = mtr * (1 - (isNaN(fold) ? 0 : fold) / 100);
  // Format dynamically: integer, 1 decimal, or 2 decimals
  return netMtr % 1 === 0
    ? netMtr.toFixed(0)
    : (netMtr * 10) % 1 === 0
    ? netMtr.toFixed(1)
    : netMtr.toFixed(2);
}

function getItemAmount(item: any): string {
  if (!item) return "0.00";
  const netMtr = parseFloat(getItemNetMtr(item)) || 0;
  const rate = parseFloat(item.rate) || 0;
  let discountPercent = 0;
  if (item.discount) {
    if (typeof item.discount === "number") {
      discountPercent = item.discount;
    } else if (typeof item.discount === "object" && item.discount.amount !== undefined) {
      discountPercent = parseFloat(item.discount.amount) || 0;
    }
  }
  const gross = netMtr * rate;
  const net = gross * (1 - discountPercent / 100);
  return net.toFixed(2);
}

function getItemIgst(item: any): string {
  if (!item) return "0.00";
  const amount = parseFloat(getItemAmount(item)) || 0;
  const gstRate =
    item.gstRate !== undefined
      ? parseFloat(item.gstRate)
      : item.taxRate !== undefined
      ? parseFloat(item.taxRate)
      : 0;
  if (item.igst !== undefined && parseFloat(item.igst) > 0) {
    return parseFloat(item.igst).toFixed(2);
  }
  const igst = (amount * (isNaN(gstRate) ? 0 : gstRate)) / 100;
  return igst.toFixed(2);
}

// Register all custom helpers safely on Handlebars when available
function registerHelpers() {
  const HB = (window as any).Handlebars;
  if (!HB) {
    setTimeout(registerHelpers, 50);
    return;
  }

  HB.registerHelper("getItemCustomField", getItemCustomField);

  HB.registerHelper("getItemPcs", function (item: any) {
    if (!item) return "";
    const customPcs = getItemCustomField(item, "PCS") || getItemCustomField(item, "pcs");
    if (customPcs !== "") return customPcs;
    if (item.unit && item.unit.toUpperCase() === "PCS") return item.quantity;
    return "";
  });

  HB.registerHelper("getItemMtr", getItemMtr);
  HB.registerHelper("getItemFoldLess", getItemFoldLess);
  HB.registerHelper("getItemNetMtr", getItemNetMtr);

  HB.registerHelper("getItemUom", function (item: any) {
    if (!item) return "MTR";
    const uom = getItemCustomField(item, "UOM") || getItemCustomField(item, "uom") || item.unit;
    return uom ? String(uom).toUpperCase() : "MTR";
  });

  HB.registerHelper("getItemDiscount", function (item: any) {
    if (!item) return "0.00%";
    let discountPercent = 0;
    if (item.discount) {
      if (typeof item.discount === "number") {
        discountPercent = item.discount;
      } else if (typeof item.discount === "object" && item.discount.amount !== undefined) {
        discountPercent = parseFloat(item.discount.amount) || 0;
      }
    }
    return discountPercent.toFixed(2) + "%";
  });

  HB.registerHelper("getItemGstRate", function (item: any) {
    if (!item) return "0.00%";
    const gstRate =
      item.gstRate !== undefined
        ? parseFloat(item.gstRate)
        : item.taxRate !== undefined
        ? parseFloat(item.taxRate)
        : 0;
    return gstRate.toFixed(2) + "%";
  });

  HB.registerHelper("getItemAmount", getItemAmount);
  HB.registerHelper("getItemIgst", getItemIgst);

  HB.registerHelper("getItemTotal", function (item: any) {
    if (!item) return "0.00";
    if (item.total !== undefined && parseFloat(item.total) > 0) {
      return parseFloat(item.total).toFixed(2);
    }
    const amount = parseFloat(getItemAmount(item)) || 0;
    const igst = parseFloat(getItemIgst(item)) || 0;
    const cgst = item.cgst !== undefined ? parseFloat(item.cgst) || 0 : 0;
    const sgst = item.sgst !== undefined ? parseFloat(item.sgst) || 0 : 0;
    if (cgst > 0 || sgst > 0) {
      return (amount + cgst + sgst).toFixed(2);
    }
    return (amount + igst).toFixed(2);
  });

  // Helper to pad the items table up to a minimum number of rows
  HB.registerHelper("padRows", function (items: any[], minRows: number, options: any) {
    const currentLen = (items && items.length) || 0;
    if (currentLen >= minRows) {
      return "";
    }
    let accum = "";
    for (let i = currentLen; i < minRows; i++) {
      accum += options.fn({ index: i + 1 });
    }
    return accum;
  });

  // Helper to format currency values cleanly without symbols
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
}

registerHelpers();

// Export template to global for main renderer to consume
window.CeresTemplateDataMapper = normalizeInvoiceTemplateState as any;
window.CeresTemplate = template;
