import HandlebarsRuntime from "handlebars/runtime";
import sample from "../src/types/sample.json";
import { normalizeInvoiceTemplateState } from "../src/main/invoiceTemplateNormalization";
// @ts-ignore
import template from "../src/templates/revvity-quote/template.hbs";

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

beforeAll(() => {
  // Register standard mock helpers
  HandlebarsRuntime.registerPartial("DemoBadge", () => "");
  HandlebarsRuntime.registerPartial("InvoiceStatus", () => "<span>Pending</span>");
  HandlebarsRuntime.registerPartial("MarkdownViewer", () => "");
  HandlebarsRuntime.registerHelper("prepareMarkdownViewerData", () => ({}));
  HandlebarsRuntime.registerHelper("addOne", (v: number) => v + 1);
  HandlebarsRuntime.registerHelper("formateShortDateWithOffset", (value: unknown) => String(value ?? ""));

  // Register custom template helpers
  HandlebarsRuntime.registerHelper("getItemCustomField", getItemCustomField);
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
  HandlebarsRuntime.registerHelper("formatQty", function (value: any) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return value;
    return parsed < 10 ? "0" + parsed : String(parsed);
  });
  HandlebarsRuntime.registerHelper("hasContent", function (this: any, value: any, options: any) {
    if (value && String(value).trim().length > 0) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
});

describe("revvity-quote template render", () => {
  it("renders the custom Revvity quotation layout successfully", () => {
    const enrichedSample = {
      ...sample,
      invoice: {
        ...sample.invoice,
        billType: "QUOTATION",
        invoiceTitle: "QUOTATION",
        billedBy: {
          ...sample.invoice.billedBy,
          name: "Revvity Healthcare India Private Limited",
          street: "G- Corp Tech, 8th floor",
          city: "Thane West",
          state: "Maharashtra",
          pincode: "400615"
        },
        billedTo: {
          ...sample.invoice.billedTo,
          name: "CDER AIIMS"
        },
        items: [
          {
            _id: "item_1",
            name: "Filled High Pressure seamless gas Cylinder",
            quantity: 1,
            rate: 380000.00,
            amount: 68400.00,
            hsn: "40,000.00"
          }
        ]
      }
    };

    const model = normalizeInvoiceTemplateState(enrichedSample);
    const html = template(model);

    expect(html).toContain("Revvity Healthcare India Private Limited");
    expect(html).toContain("CDER AIIMS");
    expect(html).toContain("Ref. No.");
    expect(html).toContain("Dated");
    expect(html).toContain("Filled High Pressure seamless gas Cylinder");
    expect(html).toContain("DESCRIPTION");
    expect(html).toContain("HSN/ SAC");
    expect(html).toContain("Total (INR)");
  });
});
