import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface PdfReportInput {
  companyName: string | null;
  periodLabel: string;
  generatedAtLabel: string;
  screenNames: string[];
  totals: { plays: number; durationLabel: string };
  rows: {
    title: string;
    screenName: string;
    createdAtLabel: string;
    plays: number;
    durationLabel: string;
    lastPlayedLabel: string;
  }[];
  daily: {
    dayLabel: string;
    title: string;
    screenName: string;
    plays: number;
    durationLabel: string;
  }[];
  dailyTruncated: boolean;
}

interface Column {
  header: string;
  width: number;
  align?: "right";
  maxLines?: number;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = MARGIN + 14;

const INK = rgb(0.1, 0.1, 0.13);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.87, 0.88, 0.9);
const FILL = rgb(0.955, 0.958, 0.965);
const ACCENT = rgb(0.91, 0.48, 0.21);

const CELL_FONT = 8.5;
const CELL_LINE = 11;
const CELL_PAD_X = 5;
const CELL_PAD_Y = 5;

export async function buildPlaybackReportPdf(input: PdfReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Relatório de Exibição");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // The standard fonts only cover WinAnsi; anything else (emoji, arrows...)
  // would make pdf-lib throw, so it's swapped for "?".
  const supported = new Set(regular.getCharacterSet());
  const clean = (text: string) =>
    Array.from(text.replace(/\s+/g, " ").trim())
      .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");

  const fit = (text: string, font: PDFFont, size: number, maxWidth: number) => {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && font.widthOfTextAtSize(cut + "...", size) > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return cut + "...";
  };

  const wrap = (text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) => {
    const lines: string[] = [];
    let current = "";
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const candidate = current ? current + " " + words[i] : words[i];
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (lines.length === maxLines - 1) {
        // Out of lines: put everything that's left on the last one, truncated.
        lines.push(fit([current, ...words.slice(i)].filter(Boolean).join(" "), font, size, maxWidth));
        return lines;
      }
      if (current) lines.push(current);
      current = words[i];
    }
    if (current) lines.push(fit(current, font, size, maxWidth));
    return lines.length ? lines : [""];
  };

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const text = (
    value: string,
    x: number,
    baseline: number,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(value, {
      x,
      y: baseline,
      font: opts.font ?? regular,
      size: opts.size ?? 9,
      color: opts.color ?? INK,
    });
  };

  // ---- Header -------------------------------------------------------------
  text("Relatório de Exibição", MARGIN, y - 18, { font: bold, size: 18 });
  y -= 26;
  page.drawRectangle({ x: MARGIN, y: y - 2, width: 46, height: 2.5, color: ACCENT });
  y -= 16;
  if (input.companyName) {
    text(clean(input.companyName), MARGIN, y - 10, { size: 11, color: MUTED });
    y -= 18;
  }

  const metaLine = (label: string, value: string) => {
    const labelWidth = bold.widthOfTextAtSize(label + " ", 9);
    const lines = wrap(clean(value), regular, 9, CONTENT_W - labelWidth, 3);
    text(label, MARGIN, y - 9, { font: bold });
    lines.forEach((line, i) => text(line, MARGIN + labelWidth, y - 9 - i * 12));
    y -= lines.length * 12 + 2;
  };
  y -= 4;
  metaLine("Período:", input.periodLabel);
  metaLine("Telas:", input.screenNames.join(", ") || "-");
  metaLine("Gerado em:", input.generatedAtLabel);
  y -= 10;

  // ---- Summary boxes ------------------------------------------------------
  const boxes = [
    { label: "Total de exibições", value: input.totals.plays.toLocaleString("pt-BR") },
    { label: "Tempo total em exibição", value: input.totals.durationLabel },
    { label: "Mídias no relatório", value: String(input.rows.length) },
  ];
  const gap = 10;
  const boxW = (CONTENT_W - gap * (boxes.length - 1)) / boxes.length;
  const boxH = 46;
  boxes.forEach((box, i) => {
    const x = MARGIN + i * (boxW + gap);
    page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, color: FILL });
    text(box.label, x + 10, y - 16, { size: 8, color: MUTED });
    text(box.value, x + 10, y - 36, { font: bold, size: 15 });
  });
  y -= boxH + 22;

  // ---- Tables -------------------------------------------------------------
  const drawTable = (
    title: string,
    columns: Column[],
    rows: string[][],
    totalRow?: string[],
  ) => {
    const headerH = 20;

    const drawHeader = () => {
      page.drawRectangle({ x: MARGIN, y: y - headerH, width: CONTENT_W, height: headerH, color: FILL });
      let x = MARGIN;
      for (const col of columns) {
        const label = fit(col.header, bold, 7.5, col.width - CELL_PAD_X * 2);
        const tx = col.align === "right"
          ? x + col.width - CELL_PAD_X - bold.widthOfTextAtSize(label, 7.5)
          : x + CELL_PAD_X;
        text(label, tx, y - 13, { font: bold, size: 7.5, color: MUTED });
        x += col.width;
      }
      y -= headerH;
    };

    const drawRow = (cells: string[], font: PDFFont) => {
      const lines = cells.map((cell, i) =>
        wrap(clean(cell), font, CELL_FONT, columns[i].width - CELL_PAD_X * 2, columns[i].maxLines ?? 1),
      );
      const rowH = Math.max(...lines.map((l) => l.length)) * CELL_LINE + CELL_PAD_Y * 2;
      if (y - rowH < BOTTOM) {
        newPage();
        drawHeader();
      }
      let x = MARGIN;
      lines.forEach((cellLines, i) => {
        const col = columns[i];
        cellLines.forEach((line, li) => {
          const tx = col.align === "right"
            ? x + col.width - CELL_PAD_X - font.widthOfTextAtSize(line, CELL_FONT)
            : x + CELL_PAD_X;
          text(line, tx, y - CELL_PAD_Y - 8 - li * CELL_LINE, { font, size: CELL_FONT });
        });
        x += col.width;
      });
      y -= rowH;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + CONTENT_W, y },
        thickness: 0.5,
        color: LINE,
      });
    };

    // Keep the title together with the header and at least one row.
    if (y - (18 + headerH + 32) < BOTTOM) newPage();
    text(title, MARGIN, y - 11, { font: bold, size: 11 });
    y -= 20;
    drawHeader();
    rows.forEach((row) => drawRow(row, regular));
    if (totalRow) drawRow(totalRow, bold);
    y -= 24;
  };

  drawTable(
    "Resumo por mídia",
    [
      { header: "MÍDIA", width: 150, maxLines: 2 },
      { header: "TELA", width: 88, maxLines: 2 },
      { header: "INSERIDA EM", width: 68 },
      { header: "EXIBIÇÕES", width: 56, align: "right" },
      { header: "TEMPO EXIBIDO", width: 75.28, align: "right" },
      { header: "ÚLTIMA EXIBIÇÃO", width: 78 },
    ],
    input.rows.map((r) => [
      r.title,
      r.screenName,
      r.createdAtLabel,
      r.plays.toLocaleString("pt-BR"),
      r.durationLabel,
      r.lastPlayedLabel,
    ]),
    ["Total", "", "", input.totals.plays.toLocaleString("pt-BR"), input.totals.durationLabel, ""],
  );

  if (input.daily.length > 0) {
    drawTable(
      "Exibições por dia",
      [
        { header: "DATA", width: 62 },
        { header: "MÍDIA", width: 205, maxLines: 2 },
        { header: "TELA", width: 114.28, maxLines: 2 },
        { header: "EXIBIÇÕES", width: 58, align: "right" },
        { header: "TEMPO EXIBIDO", width: 76, align: "right" },
      ],
      input.daily.map((d) => [
        d.dayLabel,
        d.title,
        d.screenName,
        d.plays.toLocaleString("pt-BR"),
        d.durationLabel,
      ]),
    );
    if (input.dailyTruncated) {
      if (y - 14 < BOTTOM) newPage();
      text(
        "O detalhamento por dia foi limitado. Use um período ou uma seleção de mídias menor para ver tudo.",
        MARGIN,
        y,
        { size: 8, color: MUTED },
      );
    }
  }

  // ---- Footer on every page -----------------------------------------------
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Página ${i + 1} de ${pages.length}`;
    p.drawText("ScreenFlow - Relatório de Exibição", {
      x: MARGIN,
      y: MARGIN - 6,
      font: regular,
      size: 8,
      color: MUTED,
    });
    p.drawText(label, {
      x: PAGE_W - MARGIN - regular.widthOfTextAtSize(label, 8),
      y: MARGIN - 6,
      font: regular,
      size: 8,
      color: MUTED,
    });
  });

  return doc.save();
}
