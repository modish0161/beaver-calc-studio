import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

// ============================================================================
// BEAVER BRIDGES LTD — DOCX Export
// Mirrors the same PDFReportData interface used by pdfGenerator.ts so
// calculators can call generateDOCX(data) with the same payload.
// ============================================================================

/** Same shape as PDFReportData in pdfGenerator.ts */
interface ReportData {
  title?: string;
  subtitle?: string;
  date?: string;
  projectInfo?: { label: string; value: string }[] | Record<string, any>;
  inputs?:
    | { label: string; value: string | number; unit?: string }[]
    | Record<string, any>;
  sections?: (
    | {
        title: string;
        head?: string[][];
        body?: any[][];
        rows?: any;
        items?: any;
      }
    | { title: string; rows: { label: string; value: string | number }[] }
    | {
        title: string;
        items: { label: string; value: string | number; highlight?: boolean }[];
      }
    | { title: string; content?: any; table?: any }
  )[];
  tables?: (
    | { title: string; head: string[][]; body: any[][] }
    | { title: string; headers: string[]; rows: string[][] }
  )[];
  checks?: {
    name: string;
    capacity: string;
    utilisation: string;
    status: "PASS" | "FAIL";
  }[];
  recommendations?: { check: string; suggestion: string }[];
  warnings?: (string | { message: string })[];
  footerNote?: string;
  documentRef?: string;
  revision?: string;
  preparedBy?: string;
  checkedBy?: string;
  projectName?: string;
  reference?: string;
  result?: string;
  [key: string]: any;
}

// ── Brand colours (hex) ──────────────────────────────────────────────────
const BEAVER_BLUE = "23297A";
const BEAVER_GOLD = "D4AF37";
const PASS_GREEN = "228B22";
const FAIL_RED = "B22222";
const LIGHT_BG = "F1F3F5";

// ── Helpers ──────────────────────────────────────────────────────────────

function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2,
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: BEAVER_BLUE,
        size: level === HeadingLevel.HEADING_1 ? 32 : 24,
      }),
    ],
  });
}

function labelValue(
  label: string,
  value: string | number,
  unit?: string,
): Paragraph {
  const parts: TextRun[] = [
    new TextRun({ text: `${label}: `, bold: true, size: 20 }),
    new TextRun({ text: String(value), size: 20 }),
  ];
  if (unit)
    parts.push(
      new TextRun({
        text: ` ${unit}`,
        size: 20,
        italics: true,
        color: "666666",
      }),
    );
  return new Paragraph({ spacing: { after: 40 }, children: parts });
}

function thinBorder() {
  return { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
}
const cellBorders = {
  top: thinBorder(),
  bottom: thinBorder(),
  left: thinBorder(),
  right: thinBorder(),
};

function tableCell(
  text: string,
  opts?: { bold?: boolean; shading?: string; width?: number },
): TableCell {
  return new TableCell({
    borders: cellBorders,
    shading: opts?.shading
      ? { type: ShadingType.SOLID, color: opts.shading }
      : undefined,
    width: opts?.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts?.bold, size: 18 })],
      }),
    ],
  });
}

function normaliseProjectInfo(
  info: ReportData["projectInfo"],
): { label: string; value: string }[] {
  if (!info) return [];
  if (Array.isArray(info)) return info;
  return Object.entries(info).map(([k, v]) => ({ label: k, value: String(v) }));
}

function normaliseInputs(
  inputs: ReportData["inputs"],
): { label: string; value: string | number; unit?: string }[] {
  if (!inputs) return [];
  if (Array.isArray(inputs)) return inputs;
  return Object.entries(inputs).map(([k, v]) => ({
    label: k,
    value: String(v),
  }));
}

// ── Main export ──────────────────────────────────────────────────────────

export function generateDOCX(data: ReportData): void {
  const children: Paragraph[] = [];

  // ── Title Block ──────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "BEAVER BRIDGES LTD",
          bold: true,
          color: BEAVER_BLUE,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "Structural & Temporary Works Engineering",
          italics: true,
          color: "666666",
          size: 20,
        }),
      ],
    }),
  );

  // Report title
  if (data.title) {
    children.push(heading(data.title, HeadingLevel.HEADING_1));
  }
  if (data.subtitle) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: data.subtitle,
            italics: true,
            color: "666666",
            size: 20,
          }),
        ],
      }),
    );
  }

  // ── Document info row ────────────────────────────────────────────────
  const docDate = data.date || new Date().toLocaleDateString("en-GB");
  const docRef =
    data.documentRef || `BB-CALC-${Date.now().toString(36).toUpperCase()}`;
  const revision = data.revision || "Rev. A";
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Ref: ${docRef}  |  Date: ${docDate}  |  ${revision}`,
          size: 18,
          color: "888888",
        }),
      ],
    }),
  );

  // ── Project Info ─────────────────────────────────────────────────────
  const projInfo = normaliseProjectInfo(data.projectInfo);
  if (projInfo.length > 0) {
    children.push(heading("Project Information"));
    projInfo.forEach((p) => children.push(labelValue(p.label, p.value)));
  }

  // ── Inputs ───────────────────────────────────────────────────────────
  const inputs = normaliseInputs(data.inputs);
  if (inputs.length > 0) {
    children.push(heading("Design Inputs"));
    inputs.forEach((inp) =>
      children.push(labelValue(inp.label, inp.value, inp.unit)),
    );
  }

  // ── Checks table ─────────────────────────────────────────────────────
  if (data.checks && data.checks.length > 0) {
    children.push(heading("Design Checks"));
    const headerRow = new TableRow({
      children: [
        tableCell("Check", { bold: true, shading: BEAVER_BLUE }),
        tableCell("Capacity", { bold: true, shading: BEAVER_BLUE }),
        tableCell("Utilisation", { bold: true, shading: BEAVER_BLUE }),
        tableCell("Status", { bold: true, shading: BEAVER_BLUE }),
      ],
    });
    // Fix header text to white
    const rows = data.checks.map(
      (c) =>
        new TableRow({
          children: [
            tableCell(c.name),
            tableCell(c.capacity),
            tableCell(c.utilisation),
            tableCell(c.status, {
              bold: true,
              shading: c.status === "PASS" ? "E8F5E9" : "FFEBEE",
            }),
          ],
        }),
    );
    children.push(
      new Paragraph({ children: [] }), // spacer
      ...((
        new Table({
          rows: [headerRow, ...rows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }) as any
      ).__children ?? []),
    );
    // Use Packer-compatible approach: push the table as a top-level element
    // Tables go into documentSections, not children. We'll handle this in the Document constructor.
  }

  // ── Sections (generic table/list sections) ───────────────────────────
  if (data.sections) {
    for (const sec of data.sections) {
      const s = sec as any;
      children.push(heading(s.title));

      // Table with head + body
      if (s.head && s.body) {
        s.body.forEach((row: any[]) => {
          const label = String(row[0] ?? "");
          const value = String(row[1] ?? "");
          const unit = row[2] ? String(row[2]) : undefined;
          children.push(labelValue(label, value, unit));
        });
      }
      // rows: { label, value }[]
      else if (s.rows && Array.isArray(s.rows)) {
        s.rows.forEach((r: any) => {
          if (r.label !== undefined)
            children.push(labelValue(r.label, r.value));
          else if (Array.isArray(r))
            children.push(labelValue(String(r[0]), String(r[1]), r[2]));
        });
      }
      // items: { label, value, highlight? }[]
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((item: any) =>
          children.push(labelValue(item.label, item.value)),
        );
      }
    }
  }

  // ── Tables ───────────────────────────────────────────────────────────
  if (data.tables) {
    for (const tbl of data.tables) {
      const t = tbl as any;
      children.push(heading(t.title));
      if (t.head && t.body) {
        t.body.forEach((row: any[]) => {
          children.push(
            labelValue(
              String(row[0] ?? ""),
              String(row[1] ?? ""),
              row[2] ? String(row[2]) : undefined,
            ),
          );
        });
      } else if (t.headers && t.rows) {
        t.rows.forEach((row: string[]) => {
          children.push(
            labelValue(String(row[0] ?? ""), String(row[1] ?? ""), row[2]),
          );
        });
      }
    }
  }

  // ── Recommendations ──────────────────────────────────────────────────
  if (data.recommendations && data.recommendations.length > 0) {
    children.push(heading("Recommendations"));
    data.recommendations.forEach((rec) => {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${rec.check}: `, bold: true, size: 20 }),
            new TextRun({ text: rec.suggestion, size: 20 }),
          ],
        }),
      );
    });
  }

  // ── Warnings ─────────────────────────────────────────────────────────
  if (data.warnings && data.warnings.length > 0) {
    children.push(heading("Warnings"));
    data.warnings.forEach((w) => {
      const msg = typeof w === "string" ? w : w.message;
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `⚠ ${msg}`, size: 20, color: "CC6600" }),
          ],
        }),
      );
    });
  }

  // ── Footer note ──────────────────────────────────────────────────────
  if (data.footerNote) {
    children.push(
      new Paragraph({ spacing: { before: 400 }, children: [] }),
      new Paragraph({
        children: [
          new TextRun({
            text: data.footerNote,
            size: 16,
            color: "999999",
            italics: true,
          }),
        ],
      }),
    );
  }

  // ── Build document & download ────────────────────────────────────────
  // Tables need to be top-level `sections.children` elements in docx.
  // For simplicity, we build check table inline.
  const topLevelElements: (Paragraph | Table)[] = [...children];

  // Insert checks table as a real Table element (replace the spacer we pushed)
  if (data.checks && data.checks.length > 0) {
    const checksHeadingIdx = topLevelElements.findIndex(
      (el) =>
        el instanceof Paragraph &&
        (el as any).root?.[0]?.root?.includes?.("Design Checks"),
    );
    // Build table
    const hdrCells = ["Check", "Capacity", "Utilisation", "Status"].map(
      (t) =>
        new TableCell({
          borders: cellBorders,
          shading: {
            type: ShadingType.SOLID,
            color: BEAVER_BLUE,
            fill: BEAVER_BLUE,
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: t, bold: true, size: 18, color: "FFFFFF" }),
              ],
            }),
          ],
        }),
    );
    const hdrRow = new TableRow({ children: hdrCells, tableHeader: true });
    const dataRows = data.checks.map(
      (c) =>
        new TableRow({
          children: [
            tableCell(c.name),
            tableCell(c.capacity),
            tableCell(c.utilisation),
            new TableCell({
              borders: cellBorders,
              shading: {
                type: ShadingType.SOLID,
                color: c.status === "PASS" ? "E8F5E9" : "FFEBEE",
                fill: c.status === "PASS" ? "E8F5E9" : "FFEBEE",
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: c.status,
                      bold: true,
                      size: 18,
                      color: c.status === "PASS" ? PASS_GREEN : FAIL_RED,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    );
    const checksTable = new Table({
      rows: [hdrRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Find the heading for "Design Checks" — insert table right after it
    const idx = topLevelElements.findIndex(
      (el, i) =>
        el instanceof Paragraph &&
        i > 5 &&
        JSON.stringify(
          (el as any).options?.children?.[0]?.options?.text ?? "",
        ).includes("Design Checks"),
    );
    if (idx >= 0) {
      topLevelElements.splice(idx + 1, 0, checksTable);
    } else {
      topLevelElements.push(checksTable);
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [{ children: topLevelElements }],
  });

  const filename = `${(data.title ?? "Calculation").replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.docx`;

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, filename);
  });
}
