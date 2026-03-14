/**
 * add-whatif.mjs — Bulk adds WhatIfPreview (what-if sliders + maximize)
 * to all calculator pages that don't already have it.
 *
 * Usage: node add-whatif.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const CALC_DIR = path.join("frontend", "src", "pages", "calculators");

// Calculators already having whatIfMode or previewMaximized — skip them
const SKIP_FILES = new Set([
  "Abutments.tsx",
  "BearingReactions.tsx",
  "Bracing.tsx",
  "CompositeBeam.tsx",
  "DeckSlab.tsx",
  "ElastomericBearings.tsx",
  "MemberRatings.tsx",
  "MovementJoints.tsx",
  "PierDesign.tsx",
  "PileFoundations.tsx",
  "Sensitivity.tsx",
  "SpreadFootings.tsx",
  "SteelPlateGirder.tsx",
  "TransverseMembers.tsx",
]);

// ── Heuristic: field‑name → { unit, minFactor, maxFactor, stepDivisor } ──
const FIELD_HINTS = [
  {
    pattern:
      /^span$|^length$|span_length|member_length|beam_length|wall_length|pile_length|anchor_length|nail_length|bond_length|haul_length|total_length/,
    unit: "m",
    min: 1,
    max: 30,
    step: 0.5,
    priority: 1,
  },
  {
    pattern:
      /^height$|wall_height|system_height|barrier_height|fence_height|parapet_height|trench_depth|excavation_depth|pile_depth|embed|embedment/,
    unit: "m",
    min: 0.5,
    max: 15,
    step: 0.25,
    priority: 1,
  },
  {
    pattern:
      /^width$|flange_width|slab_width|footing_width|base_width|beam_width|wall_width|road_width|mat_width/,
    unit: "m",
    min: 0.2,
    max: 10,
    step: 0.1,
    priority: 2,
  },
  {
    pattern:
      /^depth$|slab_depth|beam_depth|section_depth|footing_depth|effective_depth|overall_depth/,
    unit: "mm",
    min: 100,
    max: 2000,
    step: 25,
    priority: 2,
  },
  {
    pattern:
      /^thickness$|thk|wall_thickness|flange_thickness|web_thickness|plate_thickness|slab_thickness/,
    unit: "mm",
    min: 5,
    max: 100,
    step: 1,
    priority: 3,
  },
  {
    pattern: /dead_load|permanent_load|self_weight|dead_udl|dead_load_udl/,
    unit: "kN/m",
    min: 0,
    max: 100,
    step: 0.5,
    priority: 2,
  },
  {
    pattern: /live_load|imposed_load|variable_load|live_udl|live_load_udl/,
    unit: "kN/m",
    min: 0,
    max: 100,
    step: 0.5,
    priority: 2,
  },
  {
    pattern: /wind_load|wind_pressure|wind_speed/,
    unit: "kN/m²",
    min: 0,
    max: 5,
    step: 0.1,
    priority: 3,
  },
  {
    pattern:
      /point_load|axial_load|applied_load|design_load|total_load|vertical_load|lateral_load|horizontal_load|lifting_load/,
    unit: "kN",
    min: 0,
    max: 1000,
    step: 5,
    priority: 2,
  },
  {
    pattern: /moment|applied_moment|design_moment/,
    unit: "kNm",
    min: 0,
    max: 500,
    step: 5,
    priority: 3,
  },
  {
    pattern: /pressure|bearing_pressure|soil_pressure|surcharge/,
    unit: "kN/m²",
    min: 0,
    max: 200,
    step: 1,
    priority: 3,
  },
  {
    pattern: /diameter|dia$|bar_dia|pile_diameter|bolt_diameter/,
    unit: "mm",
    min: 8,
    max: 1200,
    step: 2,
    priority: 3,
  },
  {
    pattern: /fck|concrete_strength/,
    unit: "MPa",
    min: 20,
    max: 50,
    step: 5,
    priority: 4,
  },
  {
    pattern: /fy$|steel_strength|yield_strength|yield/,
    unit: "MPa",
    min: 235,
    max: 500,
    step: 5,
    priority: 4,
  },
  {
    pattern: /cover|concrete_cover/,
    unit: "mm",
    min: 25,
    max: 75,
    step: 5,
    priority: 4,
  },
  {
    pattern: /angle|slope_angle|friction_angle|ramp_angle|rake_angle/,
    unit: "°",
    min: 0,
    max: 90,
    step: 1,
    priority: 3,
  },
  {
    pattern: /spacing|nail_spacing|prop_spacing|bay_spacing/,
    unit: "m",
    min: 0.5,
    max: 5,
    step: 0.25,
    priority: 3,
  },
  {
    pattern: /number|num_|count|panels|layers|bays/,
    unit: "",
    min: 1,
    max: 20,
    step: 1,
    priority: 4,
  },
];

function snakeToTitle(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickSliders(formFields) {
  const numeric = formFields.filter(
    (f) => /^[\d.]+$/.test(f.defaultVal) && parseFloat(f.defaultVal) >= 0,
  );
  const scored = numeric.map((f) => {
    const hint = FIELD_HINTS.find((h) => h.pattern.test(f.name));
    const defVal = parseFloat(f.defaultVal);
    if (hint) {
      return {
        key: f.name,
        label: snakeToTitle(f.name),
        min: hint.min,
        max: Math.max(hint.max, defVal * 3),
        step: hint.step,
        unit: hint.unit,
        priority: hint.priority,
      };
    }
    // Generic numeric field
    return {
      key: f.name,
      label: snakeToTitle(f.name),
      min: 0,
      max: Math.max(defVal * 3, 10),
      step: defVal > 10 ? 1 : 0.1,
      unit: "",
      priority: 10,
    };
  });
  // Sort by priority, take up to 6
  scored.sort((a, b) => a.priority - b.priority);
  return scored.slice(0, 6);
}

function extractFormFields(content) {
  // Match: const [form, setForm] = useState<TYPE>({ ... });
  const formMatch = content.match(
    /const \[form,\s*setForm\]\s*=\s*useState<(\w+)>\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/s,
  );
  if (!formMatch) return { formType: null, fields: [] };
  const formType = formMatch[1];
  const body = formMatch[2];
  const fields = [];
  const fieldRe = /(\w+)\s*:\s*['"]([^'"]*)['"]/g;
  let m;
  while ((m = fieldRe.exec(body)) !== null) {
    fields.push({ name: m[1], defaultVal: m[2] });
  }
  return { formType, fields };
}

function extractComponentName(content) {
  const m = content.match(/export default (\w+)/);
  return m ? m[1] : null;
}

function deriveTitle(componentName) {
  // CamelCase → "Camel Case"
  return componentName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function findFirstDiagramCard(lines) {
  // Find the first <Interactive3DDiagram line
  let diagStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("<Interactive3DDiagram")) {
      diagStart = i;
      break;
    }
  }
  if (diagStart === -1) return null;

  // Walk backward to find the enclosing <Card
  let cardOpen = -1;
  for (let i = diagStart - 1; i >= 0; i--) {
    if (lines[i].match(/<Card\b/)) {
      cardOpen = i;
      break;
    }
  }
  if (cardOpen === -1) return null;

  // Find </Interactive3DDiagram>
  let diagEnd = -1;
  for (let i = diagStart; i < lines.length; i++) {
    if (lines[i].includes("</Interactive3DDiagram>")) {
      diagEnd = i;
      break;
    }
  }
  if (diagEnd === -1) return null;

  // Find the closing </Card> - count nesting
  let depth = 0;
  let cardClose = -1;
  for (let i = cardOpen; i < lines.length; i++) {
    const openCount = (lines[i].match(/<Card[\s>]/g) || []).length;
    const closeCount = (lines[i].match(/<\/Card>/g) || []).length;
    depth += openCount - closeCount;
    if (depth <= 0) {
      cardClose = i;
      break;
    }
  }
  if (cardClose === -1) return null;

  // Extract the Interactive3DDiagram block (inner content between the tags)
  const diagBlock = lines.slice(diagStart, diagEnd + 1);

  // Extract height
  const heightMatch = diagBlock.join("\n").match(/height="([^"]+)"/);
  const height = heightMatch ? heightMatch[1] : "h-[350px]";

  // Extract cameraPosition
  const camMatch = diagBlock
    .join("\n")
    .match(/cameraPosition=\{(\[[^\]]+\])\}/);
  const cam = camMatch ? camMatch[1] : "[8, 5, 8]";

  // Extract status prop
  const statusMatch = diagBlock.join("\n").match(/status=\{([^}]+)\}/);
  const statusExpr = statusMatch
    ? statusMatch[1]
    : "results?.status as 'PASS' | 'FAIL' | undefined";

  return {
    cardOpen,
    cardClose,
    diagStart,
    diagEnd,
    diagBlock,
    height,
    cam,
    statusExpr,
  };
}

function buildWhatIfSlidersDef(sliders, formType) {
  if (sliders.length === 0)
    return "  const whatIfSliders: { key: string; label: string; min: number; max: number; step: number; unit: string }[] = [];";
  const items = sliders.map((s) => {
    const keyPart = formType ? `'${s.key}' as keyof ${formType}` : `'${s.key}'`;
    return `    { key: ${keyPart}, label: '${s.label}', min: ${s.min}, max: ${s.max}, step: ${s.step}, unit: '${s.unit}' },`;
  });
  return `  const whatIfSliders = [\n${items.join("\n")}\n  ];`;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);

  // Skip if already has what-if / maximize features
  if (
    content.includes("whatIfMode") ||
    content.includes("WhatIfPreview") ||
    content.includes("previewMaximized")
  ) {
    return { status: "skipped", reason: "already has features" };
  }

  if (!content.includes("Interactive3DDiagram")) {
    return { status: "skipped", reason: "no 3D diagram" };
  }

  const componentName = extractComponentName(content);
  if (!componentName) return { status: "skipped", reason: "no default export" };

  const { formType, fields } = extractFormFields(content);
  const sliders = pickSliders(fields);
  const title = deriveTitle(componentName);

  const lines = content.split("\n");
  const cardInfo = findFirstDiagramCard(lines);
  if (!cardInfo) return { status: "skipped", reason: "could not find 3D card" };

  // ── Build replacement block ──
  const indent = lines[cardInfo.cardOpen].match(/^(\s*)/)[1];
  const inner = indent + "  ";
  const inner2 = inner + "  ";

  // Get the Interactive3DDiagram block and modify height to use parameter
  let diagContent = cardInfo.diagBlock.join("\n");
  diagContent = diagContent.replace(/height="[^"]+"/, "height={fsHeight}");

  const replacement = [
    `${indent}<WhatIfPreview`,
    `${inner}title="${title} — 3D Preview"`,
    `${inner}sliders={whatIfSliders}`,
    `${inner}form={form}`,
    `${inner}updateForm={updateForm}`,
    `${inner}status={${cardInfo.statusExpr.includes("undefined") ? "(results?.status as 'PASS' | 'FAIL')" : cardInfo.statusExpr}}`,
    `${inner}renderScene={(fsHeight) => (`,
    ...diagContent.split("\n").map((l) => inner2 + l.trim()),
    `${inner})}`,
    `${indent}/>`,
  ];

  // ── Splice in the replacement ──
  const newLines = [
    ...lines.slice(0, cardInfo.cardOpen),
    ...replacement,
    ...lines.slice(cardInfo.cardClose + 1),
  ];

  // ── Add WhatIfPreview import ──
  let result = newLines.join("\n");

  // Add import for WhatIfPreview
  if (!result.includes("import WhatIfPreview")) {
    // Find a good place - after other component imports
    const importInsertIdx = result.lastIndexOf("import Interactive3DDiagram");
    if (importInsertIdx !== -1) {
      const lineEnd = result.indexOf("\n", importInsertIdx);
      result =
        result.slice(0, lineEnd + 1) +
        "import WhatIfPreview from '../../components/WhatIfPreview';\n" +
        result.slice(lineEnd + 1);
    } else {
      // Fallback: add after the last import
      const lastImport = result.lastIndexOf("\nimport ");
      if (lastImport !== -1) {
        const endOfLine = result.indexOf("\n", lastImport + 1);
        result =
          result.slice(0, endOfLine + 1) +
          "import WhatIfPreview from '../../components/WhatIfPreview';\n" +
          result.slice(endOfLine + 1);
      }
    }
  }

  // ── Add whatIfSliders definition before return ( ──
  const slidersDef = buildWhatIfSlidersDef(sliders, formType);
  const returnMatch = result.match(
    /(\n)(  \/\/ ─+\n  \/\/ Render\n  \/\/ ─+\n  return \()/,
  );
  if (returnMatch) {
    result = result.replace(
      returnMatch[2],
      `// What-If slider definitions\n${slidersDef}\n\n  ${returnMatch[2].trim()}`,
    );
  } else {
    // Fallback: find "return (" preceded by a blank/comment line
    const simpleReturn = result.match(/\n(  return \(\n)/);
    if (simpleReturn) {
      const idx = result.indexOf(simpleReturn[0]);
      result =
        result.slice(0, idx) +
        `\n  // What-If slider definitions\n${slidersDef}\n` +
        simpleReturn[0] +
        result.slice(idx + simpleReturn[0].length);
    }
  }

  return { status: "modified", content: result, sliderCount: sliders.length };
}

// ── Main ──
const files = fs
  .readdirSync(CALC_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .filter((f) => !SKIP_FILES.has(f))
  .sort();

console.log(
  `Found ${files.length} calculator files to process (${SKIP_FILES.size} skipped)`,
);

let modified = 0,
  skipped = 0,
  errors = 0;

for (const f of files) {
  const fullPath = path.join(CALC_DIR, f);
  try {
    const result = processFile(fullPath);
    if (result.status === "modified") {
      if (DRY_RUN) {
        console.log(
          `  [DRY] ${f} — would modify (${result.sliderCount} sliders)`,
        );
      } else {
        fs.writeFileSync(fullPath, result.content, "utf-8");
        console.log(`  ✓ ${f} — modified (${result.sliderCount} sliders)`);
      }
      modified++;
    } else {
      console.log(`  - ${f} — ${result.reason}`);
      skipped++;
    }
  } catch (e) {
    console.error(`  ✗ ${f} — ERROR: ${e.message}`);
    errors++;
  }
}

console.log(
  `\nDone: ${modified} modified, ${skipped} skipped, ${errors} errors`,
);
