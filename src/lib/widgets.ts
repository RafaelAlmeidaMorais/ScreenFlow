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
  description?: string;
  value: number;
}

export interface PriceTableTheme {
  background: string;
  textColor: string;
  valueBackground: string;
  valueColor: string;
  fontFamily: "digital" | "sans" | "serif";
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
    fontFamily: "digital",
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
    if (!label.trim()) throw new Error("Item " + (idx + 1) + " sem nome");
    const badge = typeof r.badge === "string" ? r.badge.slice(0, 8) : undefined;
    const badgeColor = typeof r.badgeColor === "string" && /^#[0-9a-f]{3,8}$/i.test(r.badgeColor)
      ? r.badgeColor
      : undefined;
    const description = typeof r.description === "string" ? r.description.slice(0, 200) : undefined;
    const value = typeof r.value === "number" && Number.isFinite(r.value) ? r.value : 0;
    return { id, label, badge, badgeColor, description, value };
  });

  const themeRaw = (obj.theme && typeof obj.theme === "object") ? (obj.theme as Record<string, unknown>) : {};
  const fallback = DEFAULT_THEMES[template as PriceTableTemplate];
  const theme: PriceTableTheme = {
    background: validColor(themeRaw.background, fallback.background),
    textColor: validColor(themeRaw.textColor, fallback.textColor),
    valueBackground: validColor(themeRaw.valueBackground, fallback.valueBackground),
    valueColor: validColor(themeRaw.valueColor, fallback.valueColor),
    fontFamily:
      themeRaw.fontFamily === "digital" || themeRaw.fontFamily === "sans" || themeRaw.fontFamily === "serif"
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
export function formatPriceValue(value: number, currency: string, decimals: number): string {
  const fixed = value.toFixed(decimals);
  // Use brazilian decimal separator by default; could be made configurable.
  const withComma = fixed.replace(".", ",");
  return currency + " " + withComma;
}

const FONT_FAMILIES: Record<PriceTableTheme["fontFamily"], string> = {
  digital: '"Courier New", "Lucida Console", monospace',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
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
  const font = FONT_FAMILIES[theme.fontFamily] || FONT_FAMILIES.sans;
  const itemRows = config.items
    .map((item) => renderPriceRow(item, theme, config.currency, config.decimals, font))
    .join("");

  const titleHTML = config.title
    ? `<div style="padding:1.2vmin 1.6vmin 0.6vmin;color:${theme.textColor};font-size:2vmin;font-weight:600;font-family:${font};text-transform:uppercase;letter-spacing:0.06em;opacity:0.85">${escapeHtml(config.title)}</div>`
    : "";

  return (
    `<div style="position:relative;width:100%;height:100%;background:${theme.background};color:${theme.textColor};font-family:${font};display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box">` +
    titleHTML +
    `<div style="flex:1;display:flex;flex-direction:column;justify-content:space-around;padding:0.8vmin 1.2vmin 1.2vmin;gap:0.6vmin">` +
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
): string {
  const badgeHTML = item.badge
    ? `<div style="flex:0 0 auto;width:5.2vmin;height:5.2vmin;border-radius:0.8vmin;background:${item.badgeColor || "#444"};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:3vmin;font-family:${font}">${escapeHtml(item.badge)}</div>`
    : "";

  const labelHTML = `<div style="flex:1;min-width:0;padding:0 1.2vmin">` +
    `<div style="font-size:2.4vmin;font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.label)}</div>` +
    (item.description
      ? `<div style="font-size:1.5vmin;opacity:0.65;line-height:1.2;margin-top:0.2vmin;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.description)}</div>`
      : "") +
    `</div>`;

  const valueHTML = `<div style="flex:0 0 auto;background:${theme.valueBackground};color:${theme.valueColor};padding:0.6vmin 1.4vmin;border-radius:0.6vmin;font-weight:900;font-size:3.6vmin;font-family:${font};font-variant-numeric:tabular-nums;min-width:14vmin;text-align:right">${escapeHtml(formatPriceValue(item.value, currency, decimals))}</div>`;

  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:0.8vmin">${badgeHTML}${labelHTML}${valueHTML}</div>`;
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
