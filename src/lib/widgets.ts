/**
 * Widget definitions for ScreenFlow.
 *
 * For now we ship a single widget type — PRICE_TABLE — but the architecture
 * is designed to grow. Each widget type has:
 *  - A type literal (matches DB column)
 *  - A config schema (validated server-side before persisting)
 *  - One or more "presets" / templates with default config
 *  - A render function that produces HTML for the player (server-side and
 *    re-used by the polling JS to refresh content client-side)
 *
 * Render functions output strings that contain only inline styles, so the
 * player can drop them into the DOM without any external CSS dependency.
 * Everything must remain compatible with old browsers (no template literals
 * in the runtime, only at build time).
 */

export type WidgetType = "PRICE_TABLE";

export const WIDGET_TYPES: WidgetType[] = ["PRICE_TABLE"];

// ----------------- PRICE_TABLE -----------------

export type PriceTableTemplate = "fuel" | "menu" | "exchange" | "custom";

export interface PriceTableItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  logoUrl?: string;
  description?: string;
  value: number;
  isHidden?: boolean;
}

export interface PriceTableTheme {
  background: string;
  textColor: string;
  valueBackground: string;
  valueColor: string;
  fontFamily: "digital" | "sans" | "serif" | "segment7";
}

export interface PriceTableConfig {
  title?: string;
  template: PriceTableTemplate;
  currency: string;
  decimals: number;
  items: PriceTableItem[];
  theme: PriceTableTheme;
}

const DEFAULT_THEMES: Record<PriceTableTemplate, PriceTableTheme> = {
  fuel: {
    background: "#1E1B4B",
    textColor: "#FFFFFF",
    valueBackground: "#000000",
    valueColor: "#FFFFFF",
    fontFamily: "segment7",
  },
  menu: {
    background: "#0F172A",
    textColor: "#F1F5F9",
    valueBackground: "#1E293B",
    valueColor: "#FBBF24",
    fontFamily: "serif",
  },
  exchange: {
    background: "#0B1120",
    textColor: "#E2E8F0",
    valueBackground: "#111827",
    valueColor: "#34D399",
    fontFamily: "sans",
  },
  custom: {
    background: "#111111",
    textColor: "#FFFFFF",
    valueBackground: "#000000",
    valueColor: "#FFFFFF",
    fontFamily: "sans",
  },
};

/**
 * Returns a fresh PriceTableConfig populated with sensible defaults for
 * the given template. Used when the user creates a new widget so they
 * see realistic example data immediately.
 */
export function getPriceTableDefaults(template: PriceTableTemplate): PriceTableConfig {
  switch (template) {
    case "fuel":
      return {
        title: "Combustíveis",
        template: "fuel",
        currency: "R$",
        decimals: 2,
        items: [
          { id: cuidLike("g1"), label: "Gasolina comum", badge: "G", badgeColor: "#3B82F6", value: 5.99 },
          { id: cuidLike("g2"), label: "Gasolina aditivada", badge: "G", badgeColor: "#F97316", value: 6.19 },
          { id: cuidLike("e1"), label: "Etanol", badge: "E", badgeColor: "#22C55E", value: 4.49 },
          { id: cuidLike("d1"), label: "Diesel S10", badge: "D", badgeColor: "#EAB308", value: 6.39 },
          { id: cuidLike("d2"), label: "Diesel S500", badge: "D", badgeColor: "#A855F7", value: 5.99 },
        ],
        theme: DEFAULT_THEMES.fuel,
      };
    case "menu":
      return {
        title: "Cardápio",
        template: "menu",
        currency: "R$",
        decimals: 2,
        items: [
          { id: cuidLike("m1"), label: "Hambúrguer artesanal", description: "Pão brioche, blend 180g, queijo cheddar", value: 32.0 },
          { id: cuidLike("m2"), label: "Batata frita média", description: "Porção 250g", value: 18.0 },
          { id: cuidLike("m3"), label: "Refrigerante lata", description: "350ml", value: 7.0 },
        ],
        theme: DEFAULT_THEMES.menu,
      };
    case "exchange":
      return {
        title: "Câmbio",
        template: "exchange",
        currency: "R$",
        decimals: 4,
        items: [
          { id: cuidLike("e1"), label: "Dólar americano", badge: "USD", badgeColor: "#10B981", value: 5.1234 },
          { id: cuidLike("e2"), label: "Euro", badge: "EUR", badgeColor: "#3B82F6", value: 5.5678 },
          { id: cuidLike("e3"), label: "Libra", badge: "GBP", badgeColor: "#8B5CF6", value: 6.4321 },
        ],
        theme: DEFAULT_THEMES.exchange,
      };
    case "custom":
    default:
      return {
        title: "",
        template: "custom",
        currency: "R$",
        decimals: 2,
        items: [
          { id: cuidLike("c1"), label: "Item 1", value: 0 },
        ],
        theme: DEFAULT_THEMES.custom,
      };
  }
}

/**
 * Validates and normalises a PriceTableConfig coming from user input.
 * Throws on invalid data so server actions can surface a clean error.
 */
export function validatePriceTableConfig(input: unknown): PriceTableConfig {
  if (!input || typeof input !== "object") throw new Error("Configuração inválida");
  const obj = input as Record<string, unknown>;

  const template = obj.template;
  if (template !== "fuel" && template !== "menu" && template !== "exchange" && template !== "custom") {
    throw new Error("Template inválido");
  }

  const currency = typeof obj.currency === "string" && obj.currency.length <= 5 ? obj.currency : "R$";
  const decimals = typeof obj.decimals === "number" ? Math.max(0, Math.min(4, Math.floor(obj.decimals))) : 2;
  const title = typeof obj.title === "string" ? obj.title.slice(0, 100) : "";

  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  if (itemsRaw.length > 50) throw new Error("Máximo de 50 itens por tabela");
  const items: PriceTableItem[] = itemsRaw.map((raw, idx) => {
    if (!raw || typeof raw !== "object") throw new Error("Item inválido na posição " + idx);
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim().slice(0, 64) : cuidLike("i" + idx);
    const label = typeof r.label === "string" ? r.label.slice(0, 80) : "";
    const badge = typeof r.badge === "string" ? r.badge.slice(0, 8) : undefined;
    const badgeColor = typeof r.badgeColor === "string" && /^#[0-9a-f]{3,8}$/i.test(r.badgeColor)
      ? r.badgeColor
      : undefined;
    const logoUrl = typeof r.logoUrl === "string" && r.logoUrl.startsWith("https://")
      ? r.logoUrl.slice(0, 500)
      : undefined;
    const description = typeof r.description === "string" ? r.description.slice(0, 200) : undefined;
    const value = typeof r.value === "number" && Number.isFinite(r.value) ? r.value : 0;
    const isHidden = r.isHidden === true ? true : undefined;
    // Label is required only when there's no visual identifier (logo or badge)
    if (!label.trim() && !logoUrl && !badge) {
      throw new Error("Item " + (idx + 1) + " precisa de um nome, logo ou badge");
    }
    return { id, label, badge, badgeColor, logoUrl, description, value, isHidden };
  });

  const themeRaw = (obj.theme && typeof obj.theme === "object") ? (obj.theme as Record<string, unknown>) : {};
  const fallback = DEFAULT_THEMES[template as PriceTableTemplate];
  const theme: PriceTableTheme = {
    background: validColor(themeRaw.background, fallback.background),
    textColor: validColor(themeRaw.textColor, fallback.textColor),
    valueBackground: validColor(themeRaw.valueBackground, fallback.valueBackground),
    valueColor: validColor(themeRaw.valueColor, fallback.valueColor),
    fontFamily:
      themeRaw.fontFamily === "digital" || themeRaw.fontFamily === "sans" || themeRaw.fontFamily === "serif" || themeRaw.fontFamily === "segment7"
        ? themeRaw.fontFamily
        : fallback.fontFamily,
  };

  return {
    title,
    template: template as PriceTableTemplate,
    currency,
    decimals,
    items,
    theme,
  };
}

function validColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)) return value;
  return fallback;
}

/**
 * Format a numeric value with the configured currency and decimal places.
 */
export function formatPriceValue(value: number, _currency: string, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const withComma = fixed.replace(".", ",");
  return withComma;
}

const DSEG7_WOFF2_BASE64 = "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";

const FONT_FAMILIES: Record<PriceTableTheme["fontFamily"], string> = {
  digital: "'Courier New', 'Lucida Console', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  segment7: "'DSEG7 Classic', 'Courier New', monospace",
};

/**
 * Render a PriceTable widget to a self-contained HTML string. The output
 * uses only inline styles so it can be dropped into any container without
 * leaking CSS or depending on global classes — important for the player
 * which targets old WebOS browsers.
 *
 * The same function is used both at SSR time (player route) and inside
 * the polling JS that refreshes widget content client-side.
 */
export function renderPriceTableHTML(config: PriceTableConfig): string {
  const theme = config.theme;
  const isSegment7 = theme.fontFamily === "segment7";
  const containerFont = isSegment7 ? FONT_FAMILIES.digital : (FONT_FAMILIES[theme.fontFamily] || FONT_FAMILIES.sans);
  const font = containerFont;
  const visibleItems = config.items.filter((item) => !item.isHidden);
  const itemRows = visibleItems
    .map((item) => renderPriceRow(item, theme, config.currency, config.decimals, font, isSegment7))
    .join("");

  const fontFaceCSS = isSegment7
    ? '<style>@font-face{font-family:"DSEG7 Classic";src:url(data:font/woff2;base64,' + DSEG7_WOFF2_BASE64 + ') format("woff2");font-weight:bold;font-style:normal;font-display:block}</style>'
    : "";

  const titleHTML = config.title
    ? `<div style="flex:0 0 auto;padding:1.5% 2% 0.5%;color:${theme.textColor};font-size:5cqh;font-weight:600;font-family:${containerFont};text-transform:uppercase;letter-spacing:0.06em;opacity:0.85;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(config.title)}</div>`
    : "";

  return (
    fontFaceCSS +
    `<div style="container-type:size;position:relative;width:100%;height:100%;background:${theme.background};color:${theme.textColor};font-family:${containerFont};display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box">` +
    titleHTML +
    `<div style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding:1% 1.5% 1.5%;gap:1%">` +
    itemRows +
    `</div></div>`
  );
}

function renderPriceRow(
  item: PriceTableItem,
  theme: PriceTableTheme,
  currency: string,
  decimals: number,
  font: string,
  isSegment7: boolean,
): string {
  const hasLogo = !!item.logoUrl;
  const hasBadge = !!item.badge;
  const hasLabel = !!item.label && item.label.trim().length > 0;

  let badgeHTML = "";
  if (hasLogo) {
    // flex:0 0 auto + max-width keeps the logo container tight to the image's natural size,
    // so the value can sit right next to it with no empty gap.
    const maxLogoWidth = hasLabel ? "32%" : "55%";
    badgeHTML = `<div style="flex:0 0 auto;max-width:${maxLogoWidth};height:100%;display:flex;align-items:center;min-width:0;overflow:hidden"><img src="${escapeHtml(item.logoUrl!)}" style="height:100%;width:auto;max-width:100%;max-height:100%;object-fit:contain;display:block" /></div>`;
  } else if (hasBadge) {
    badgeHTML = `<div style="flex:0 0 auto;aspect-ratio:1;height:100%;border-radius:8cqh;background:${item.badgeColor || "#444"};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:55cqh;font-family:${font}">${escapeHtml(item.badge!)}</div>`;
  }

  // Render label area only when there's actual label text. When absent, we omit
  // the element entirely so the value sits immediately next to the logo.
  const labelHTML = hasLabel
    ? `<div style="flex:1 1 0;min-width:0;padding:0 2%;display:flex;flex-direction:column;justify-content:center">` +
      `<div style="font-size:38cqh;font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.label)}</div>` +
      (item.description
        ? `<div style="font-size:22cqh;opacity:0.65;line-height:1.2;margin-top:2cqh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.description)}</div>`
        : "") +
      `</div>`
    : "";

  const valueFont = isSegment7 ? "'DSEG7 Classic', monospace" : font;
  const valueHTML = `<div style="flex:0 0 auto;height:100%;background:${theme.valueBackground};color:${theme.valueColor};padding:0 3%;border-radius:6cqh;font-weight:900;font-size:60cqh;font-family:${valueFont};font-variant-numeric:tabular-nums;text-align:right;display:flex;align-items:center;justify-content:flex-end;line-height:1">${escapeHtml(formatPriceValue(item.value, currency, decimals))}</div>`;

  // container-type:size on the row lets the cqh units inside scale to the row's height.
  // justify-content:center keeps the [logo][value] pair packed tight together in the
  // middle of the row, regardless of how much horizontal space the widget zone has.
  return `<div style="container-type:size;display:flex;align-items:stretch;justify-content:center;flex:1 1 0;min-height:0;gap:1.5%">${badgeHTML}${labelHTML}${valueHTML}</div>`;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Cheap, non-cryptographic id generator for default item ids. We don't use
// crypto.randomUUID() because this code may be evaluated in environments
// without it; cuid-likeness is enough since IDs only need to be unique
// within a single config object.
let counter = 0;
function cuidLike(prefix: string): string {
  counter = (counter + 1) % 0xffff;
  return prefix + Date.now().toString(36) + counter.toString(36);
}

// ----------------- Generic widget helpers -----------------

export const PRICE_TABLE_TEMPLATES: { value: PriceTableTemplate; label: string; description: string }[] = [
  { value: "fuel", label: "Combustíveis", description: "Painel de preços com badges coloridos (G/E/D)" },
  { value: "menu", label: "Cardápio", description: "Itens com nome, descrição e preço" },
  { value: "exchange", label: "Câmbio", description: "Cotações de moedas com siglas" },
  { value: "custom", label: "Genérico", description: "Estrutura livre: nome + valor" },
];

export interface ValidatedWidgetCreate {
  type: WidgetType;
  config: PriceTableConfig;
}

export function validateWidgetCreate(type: string, configIn: unknown): ValidatedWidgetCreate {
  if (type !== "PRICE_TABLE") throw new Error("Tipo de widget desconhecido");
  return {
    type: "PRICE_TABLE",
    config: validatePriceTableConfig(configIn),
  };
}
