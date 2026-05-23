import HandlebarsRuntime from "handlebars/runtime";
import sample from "../src/types/sample.json";
import { normalizeInvoiceTemplateState } from "../src/main/invoiceTemplateNormalization";
// @ts-ignore
import template from "../src/templates/devkripa-invoice/template.hbs";

// Helper to look up custom fields on items (same as index.ts)
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

beforeAll(() => {
  // Register standard mock helpers
  HandlebarsRuntime.registerPartial("DemoBadge", () => "");
  HandlebarsRuntime.registerPartial("InvoiceStatus", () => "<span>Unpaid</span>");
  HandlebarsRuntime.registerPartial("MarkdownViewer", () => "");
  HandlebarsRuntime.registerHelper("prepareMarkdownViewerData", () => ({}));
  HandlebarsRuntime.registerHelper("addOne", (v: number) => v + 1);
  HandlebarsRuntime.registerHelper("formateShortDateWithOffset", (value: unknown) => String(value ?? ""));

  // Register custom template helpers
  HandlebarsRuntime.registerHelper("getItemCustomField", getItemCustomField);
  HandlebarsRuntime.registerHelper("getItemPcs", function (item: any) {
    if (!item) return "";
    const customPcs = getItemCustomField(item, "PCS") || getItemCustomField(item, "pcs");
    if (customPcs !== "") return customPcs;
    if (item.unit && item.unit.toUpperCase() === "PCS") return item.quantity;
    return "";
  });
  HandlebarsRuntime.registerHelper("getItemMtr", getItemMtr);
  HandlebarsRuntime.registerHelper("getItemFoldLess", getItemFoldLess);
  HandlebarsRuntime.registerHelper("getItemNetMtr", getItemNetMtr);
  HandlebarsRuntime.registerHelper("getItemUom", function (item: any) {
    if (!item) return "MTR";
    const uom = getItemCustomField(item, "UOM") || getItemCustomField(item, "uom") || item.unit;
    return uom ? String(uom).toUpperCase() : "MTR";
  });
  HandlebarsRuntime.registerHelper("getItemDiscount", function (item: any) {
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
  HandlebarsRuntime.registerHelper("getItemGstRate", function (item: any) {
    if (!item) return "0.00%";
    const gstRate =
      item.gstRate !== undefined
        ? parseFloat(item.gstRate)
        : item.taxRate !== undefined
        ? parseFloat(item.taxRate)
        : 0;
    return gstRate.toFixed(2) + "%";
  });
  HandlebarsRuntime.registerHelper("getItemAmount", getItemAmount);
  HandlebarsRuntime.registerHelper("getItemIgst", getItemIgst);
  HandlebarsRuntime.registerHelper("getItemTotal", function (item: any) {
    if (!item) return "0.00";
    const amount = parseFloat(getItemAmount(item)) || 0;
    const igst = parseFloat(getItemIgst(item)) || 0;
    return (amount + igst).toFixed(2);
  });
  HandlebarsRuntime.registerHelper("padRows", function (items: any[], minRows: number, options: any) {
    const currentLen = (items && items.length) || 0;
    if (currentLen >= minRows) return "";
    let accum = "";
    for (let i = currentLen; i < minRows; i++) {
      accum += options.fn({ index: i + 1 });
    }
    return accum;
  });
  HandlebarsRuntime.registerHelper("formatCurrencyValue", function (value: any) {
    if (value === undefined || value === null) return "";
    return String(value);
  });
});

describe("devkripa-invoice template render", () => {
  it("renders the custom Devkripa ledger layout successfully", () => {
    // Enrich sample with custom fields for visual columns testing
    const enrichedSample = {
      ...sample,
      invoice: {
        ...sample.invoice,
        billedBy: {
          ...sample.invoice.billedBy,
          name: "DEVKRIPA TEX",
          phone: "+91 99095 34200, +91 99095 34200"
        },
        billedTo: {
          ...sample.invoice.billedTo,
          name: "MARUTI ENTERPRISES"
        },
        items: sample.invoice.items.map((item, index) => ({
          ...item,
          quantity: 180,
          unit: "MTR",
          rate: 49,
          customFields: [
            { label: "PCS", value: "5", dataType: "text" },
            { label: "Fold Less %", value: "3.00", dataType: "text" }
          ]
        }))
      }
    };

    const model = normalizeInvoiceTemplateState(enrichedSample);
    const html = template(model);

    expect(html).toContain("DEVKRIPA TEX");
    expect(html).toContain("MARUTI ENTERPRISES");
    expect(html.toUpperCase()).toContain("TAX INVOICE");
    expect(html).toContain("Fold Less %");
    expect(html).toContain("Net<br/>MTR");
    expect(html).toContain("Bank and UPI details");
    expect(html).toContain("This is an electronically generated document");
  });
});
