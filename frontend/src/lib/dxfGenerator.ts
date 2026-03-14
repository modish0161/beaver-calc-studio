import Drawing from "dxf-writer";
import { saveAs } from "file-saver";

// ============================================================================
// BEAVER BRIDGES LTD — DXF Export Utility
// Generates AutoCAD DXF files from geometric data produced by calculators.
// Supports: bolt patterns, plate outlines, section profiles, foundation plans.
// ============================================================================

// ── Layer colours (AutoCAD Color Index) ────────────────────────────────────
const ACI = {
  RED: 1,
  YELLOW: 2,
  GREEN: 3,
  CYAN: 4,
  BLUE: 5,
  MAGENTA: 6,
  WHITE: 7,
  GREY: 8,
  LIGHT_GREY: 9,
} as const;

// ── Public types ───────────────────────────────────────────────────────────

export interface DxfPoint {
  x: number;
  y: number;
  label?: string;
}

export interface DxfCircle {
  cx: number;
  cy: number;
  r: number;
  label?: string;
}

export interface DxfRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface DxfLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DxfPolyline {
  points: [number, number][];
  closed?: boolean;
}

export interface DxfText {
  x: number;
  y: number;
  text: string;
  height?: number;
  rotation?: number;
}

/** All geometry a calculator wants to export in one DXF file */
export interface DxfExportData {
  title: string;
  unit?: "Millimeters" | "Meters" | "Inches" | "Feet";
  /** Layers → items. Each layer is auto-created with an appropriate colour */
  layers?: {
    name: string;
    colour?: number;
    lines?: DxfLine[];
    circles?: DxfCircle[];
    rects?: DxfRect[];
    polylines?: DxfPolyline[];
    texts?: DxfText[];
    points?: DxfPoint[];
  }[];
  /** Convenience: top-level circles (placed on "HOLES" layer) */
  holes?: DxfCircle[];
  /** Convenience: top-level outline rect (placed on "OUTLINE" layer) */
  outline?: DxfRect;
  /** Convenience: top-level annotation texts (placed on "ANNOTATIONS" layer) */
  annotations?: DxfText[];
  /** Convenience: top-level dimension lines (placed on "DIMENSIONS" layer) */
  dimensions?: DxfLine[];
}

// ── Core export function ───────────────────────────────────────────────────

export function generateDXF(data: DxfExportData): void {
  const d = new Drawing();
  d.setUnits(data.unit ?? "Millimeters");

  // Default layers for convenience fields
  d.addLayer("OUTLINE", ACI.WHITE, "CONTINUOUS");
  d.addLayer("HOLES", ACI.CYAN, "CONTINUOUS");
  d.addLayer("ANNOTATIONS", ACI.GREEN, "CONTINUOUS");
  d.addLayer("DIMENSIONS", ACI.YELLOW, "CONTINUOUS");
  d.addLayer("CENTRE_LINES", ACI.RED, "CONTINUOUS");

  // ── Convenience outline ────────────────────────────────────────────
  if (data.outline) {
    d.setActiveLayer("OUTLINE");
    const { x, y, w, h } = data.outline;
    d.drawRect(x, y, x + w, y + h);
    if (data.outline.label) {
      d.drawText(x + w / 2, y - 3, 2.5, 0, data.outline.label, "center");
    }
  }

  // ── Convenience holes ──────────────────────────────────────────────
  if (data.holes) {
    d.setActiveLayer("HOLES");
    for (const h of data.holes) {
      d.drawCircle(h.cx, h.cy, h.r);
      // Cross-hair centre marks
      d.setActiveLayer("CENTRE_LINES");
      const cm = h.r * 0.4;
      d.drawLine(h.cx - cm, h.cy, h.cx + cm, h.cy);
      d.drawLine(h.cx, h.cy - cm, h.cx, h.cy + cm);
      d.setActiveLayer("HOLES");
      if (h.label) {
        d.setActiveLayer("ANNOTATIONS");
        d.drawText(h.cx + h.r + 1, h.cy, 2, 0, h.label);
        d.setActiveLayer("HOLES");
      }
    }
  }

  // ── Convenience annotations ────────────────────────────────────────
  if (data.annotations) {
    d.setActiveLayer("ANNOTATIONS");
    for (const t of data.annotations) {
      d.drawText(t.x, t.y, t.height ?? 2.5, t.rotation ?? 0, t.text);
    }
  }

  // ── Convenience dimensions ─────────────────────────────────────────
  if (data.dimensions) {
    d.setActiveLayer("DIMENSIONS");
    for (const l of data.dimensions) {
      d.drawLine(l.x1, l.y1, l.x2, l.y2);
    }
  }

  // ── Custom layers ──────────────────────────────────────────────────
  if (data.layers) {
    for (const layer of data.layers) {
      const colour = layer.colour ?? ACI.WHITE;
      // Only add the layer if not already one of the defaults
      if (
        ![
          "OUTLINE",
          "HOLES",
          "ANNOTATIONS",
          "DIMENSIONS",
          "CENTRE_LINES",
        ].includes(layer.name)
      ) {
        d.addLayer(layer.name, colour, "CONTINUOUS");
      }
      d.setActiveLayer(layer.name);

      if (layer.lines) {
        for (const l of layer.lines) d.drawLine(l.x1, l.y1, l.x2, l.y2);
      }
      if (layer.circles) {
        for (const c of layer.circles) d.drawCircle(c.cx, c.cy, c.r);
      }
      if (layer.rects) {
        for (const r of layer.rects) d.drawRect(r.x, r.y, r.x + r.w, r.y + r.h);
      }
      if (layer.polylines) {
        for (const p of layer.polylines) d.drawPolyline(p.points, p.closed);
      }
      if (layer.texts) {
        for (const t of layer.texts)
          d.drawText(t.x, t.y, t.height ?? 2.5, t.rotation ?? 0, t.text);
      }
      if (layer.points) {
        for (const p of layer.points) d.drawPoint(p.x, p.y);
      }
    }
  }

  // ── Title block annotation ─────────────────────────────────────────
  d.setActiveLayer("ANNOTATIONS");
  d.drawText(0, -10, 3, 0, `Beaver Bridges Ltd — ${data.title}`);
  d.drawText(
    0,
    -15,
    2,
    0,
    `Generated: ${new Date().toLocaleDateString("en-GB")}`,
  );

  // ── Save ───────────────────────────────────────────────────────────
  const content = d.toDxfString();
  const blob = new Blob([content], { type: "application/dxf" });
  const filename = `${data.title.replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.dxf`;
  saveAs(blob, filename);
}

// ── Helper: generate bolt pattern geometry ─────────────────────────────────

export interface BoltPatternConfig {
  /** Plate width (mm) */
  plateWidth: number;
  /** Plate height (mm) */
  plateHeight: number;
  /** Number of bolt columns */
  cols: number;
  /** Number of bolt rows */
  rows: number;
  /** Bolt hole diameter (mm) */
  holeDiameter: number;
  /** Horizontal gauge (centre-to-centre of columns) */
  gauge: number;
  /** Vertical pitch (centre-to-centre of rows) */
  pitch: number;
  /** Edge distance from plate edge to first bolt centre */
  edgeDistance: number;
}

export function generateBoltPatternDXF(
  config: BoltPatternConfig,
  title = "Bolt Pattern",
): void {
  const {
    plateWidth,
    plateHeight,
    cols,
    rows,
    holeDiameter,
    gauge,
    pitch,
    edgeDistance,
  } = config;
  const r = holeDiameter / 2;

  const holes: DxfCircle[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      holes.push({
        cx: edgeDistance + col * gauge,
        cy: edgeDistance + row * pitch,
        r,
      });
    }
  }

  generateDXF({
    title,
    outline: {
      x: 0,
      y: 0,
      w: plateWidth,
      h: plateHeight,
      label: `${plateWidth} x ${plateHeight} mm`,
    },
    holes,
    annotations: [
      {
        x: plateWidth / 2,
        y: plateHeight + 5,
        text: `${cols}×${rows} bolt pattern, Ø${holeDiameter}mm holes`,
        height: 3,
      },
      {
        x: plateWidth / 2,
        y: plateHeight + 10,
        text: `Gauge: ${gauge}mm  Pitch: ${pitch}mm  Edge: ${edgeDistance}mm`,
        height: 2.5,
      },
    ],
  });
}
