/**
 * fix-mouse-spotlight.mjs
 *
 * Automated migration: replace per-component mousePosition useState + mousemove
 * re-render patterns with the shared <MouseSpotlight /> ref-based component.
 *
 * Run from frontend/: node fix-mouse-spotlight.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "src", "pages", "calculators");
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

let totalFixed = 0;
const warnings = [];

for (const file of files) {
  const filePath = join(dir, file);
  let src = readFileSync(filePath, "utf8");

  // Skip if no mouse tracking state
  const hasMousePosition = src.includes("setMousePosition");
  const hasMousePos = src.includes("setMousePos");
  if (!hasMousePosition && !hasMousePos) continue;

  // Skip already-fixed file
  if (file === "Bracing.tsx") {
    console.log(`SKIP ${file} (already fixed)`);
    continue;
  }

  const original = src;
  const getLines = () => src.split("\n");
  console.log(`\n>>> ${file}`);

  // ────────────────────────────────────────────────
  // 1. Remove `const [mousePosition, setMousePosition] = useState(...)`
  //    Also handle `mousePos` variant (SteelBeamBending etc.)
  // ────────────────────────────────────────────────
  src = src.replace(
    /^[ \t]*const\s+\[mousePosition,\s*setMousePosition\]\s*=\s*useState\b[^;\n]*;\s*\n/gm,
    "",
  );
  src = src.replace(
    /^[ \t]*const\s+\[mousePos,\s*setMousePos\]\s*=\s*useState\b[^;\n]*;\s*\n/gm,
    "",
  );

  // ────────────────────────────────────────────────
  // 2. Remove useEffect-based mousemove handlers (all naming variants)
  //    Matches the whole useEffect(..., []); block.
  // ────────────────────────────────────────────────
  {
    const ll = getLines();
    let i = 0;
    while (i < ll.length) {
      const line = ll[i];
      if (/useEffect\s*\(/.test(line)) {
        let snippet = "";
        let endIdx = -1;
        for (let j = i; j < Math.min(i + 20, ll.length); j++) {
          snippet += ll[j] + "\n";
          if (/\}\s*,\s*\[\s*\]\s*\)\s*;/.test(ll[j]) && j > i) {
            endIdx = j;
            break;
          }
        }
        if (
          endIdx > i &&
          /setMousePos(?:ition)?\(/.test(snippet) &&
          /mousemove/.test(snippet)
        ) {
          let start = i;
          if (start > 0 && /^\s*\/\/.*[Mm]ouse/.test(ll[start - 1])) start--;
          ll.splice(start, endIdx - start + 1);
          src = ll.join("\n");
          continue;
        }
      }
      i++;
    }
  }

  // ────────────────────────────────────────────────
  // 3. Remove onMouseMove JSX props that trigger setMousePosition/setMousePos
  //    Several patterns: single-line and multi-line
  // ────────────────────────────────────────────────
  // Multi-line onMouseMove={...} blocks (GroundAnchor pattern spanning ~4 lines)
  {
    const ll = getLines();
    let i = 0;
    while (i < ll.length) {
      if (
        /onMouseMove=\{/.test(ll[i]) &&
        /setMousePos(?:ition)?\(/.test(ll.slice(i, i + 6).join("\n"))
      ) {
        let braces = 0;
        let start = i;
        let endIdx = i;
        for (let j = i; j < Math.min(i + 10, ll.length); j++) {
          for (const ch of ll[j]) {
            if (ch === "{") braces++;
            if (ch === "}") braces--;
          }
          if (braces <= 0) {
            endIdx = j;
            break;
          }
        }
        const before = ll[start].replace(/\s*onMouseMove=\{.*/, "");
        if (before.trim()) {
          ll[start] = before;
          ll.splice(start + 1, endIdx - start);
        } else {
          ll.splice(start, endIdx - start + 1);
        }
        src = ll.join("\n");
        continue;
      }
      i++;
    }
  }
  // Single-line inline onMouseMove
  src = src.replace(
    /\s+onMouseMove=\{\([^)]*\)\s*=>\s*setMousePos(?:ition)?\([^)]*\)\}/g,
    "",
  );
  src = src.replace(/\s+onMouseMove=\{handleMouseMove\}/g, "");

  // ────────────────────────────────────────────────
  // 4. Replace spotlight divs in JSX
  // ────────────────────────────────────────────────

  // Pattern A: self-closing div with radial-gradient using mousePosition/mousePos
  {
    const ll = getLines();
    let i = 0;
    while (i < ll.length) {
      const chunk = ll.slice(i, Math.min(i + 12, ll.length)).join("\n");
      if (
        /<div\b/.test(ll[i]) &&
        /radial-gradient/.test(chunk) &&
        /mousePos(?:ition)?\./.test(chunk)
      ) {
        let endIdx = i;
        for (let j = i; j < Math.min(i + 15, ll.length); j++) {
          if (/\/>/.test(ll[j])) {
            endIdx = j;
            break;
          }
        }
        const indent = ll[i].match(/^(\s*)/)[1];
        ll.splice(i, endIdx - i + 1, `${indent}<MouseSpotlight />`);
        src = ll.join("\n");
        continue;
      }
      i++;
    }
  }

  // Pattern C: 800px positioned blob (left: mousePosition.x - 400)
  {
    const ll = getLines();
    let i = 0;
    while (i < ll.length) {
      const chunk = ll.slice(i, Math.min(i + 12, ll.length)).join("\n");
      if (
        /<div\b/.test(ll[i]) &&
        /mousePos(?:ition)?\.x\s*-\s*400/.test(chunk)
      ) {
        let endIdx = i;
        for (let j = i; j < Math.min(i + 15, ll.length); j++) {
          if (/\/>/.test(ll[j])) {
            endIdx = j;
            break;
          }
        }
        const indent = ll[i].match(/^(\s*)/)[1];
        ll.splice(i, endIdx - i + 1, `${indent}<MouseSpotlight />`);
        src = ll.join("\n");
        continue;
      }
      i++;
    }
  }

  // ────────────────────────────────────────────────
  // 5. If there are still style={{}} containing mousePosition, replace with empty
  // ────────────────────────────────────────────────
  if (/mousePos(?:ition)?\./.test(src)) {
    src = src.replace(
      /style=\{\{[^}]*mousePos(?:ition)?\.[^}]*\}\}/g,
      "style={{}}",
    );
  }

  // ────────────────────────────────────────────────
  // 6. Add MouseSpotlight import if component was placed
  // ────────────────────────────────────────────────
  if (
    src.includes("<MouseSpotlight") &&
    !src.includes("import MouseSpotlight")
  ) {
    const ll = getLines();
    let lastImport = 0;
    for (let i = 0; i < ll.length; i++) {
      if (/^\s*import\s/.test(ll[i])) lastImport = i;
    }
    ll.splice(
      lastImport + 1,
      0,
      "import MouseSpotlight from '../../components/MouseSpotlight';",
    );
    src = ll.join("\n");
  }

  // ────────────────────────────────────────────────
  // 7. Remove standalone const handleMouseMove if still present
  // ────────────────────────────────────────────────
  src = src.replace(
    /^[ \t]*const\s+handleMouseMove\s*=\s*\([^)]*\)\s*(?::\s*\w+\s*)?=>\s*\{?\s*\n?(?:[ \t]*setMousePos(?:ition)?\([^)]*\)\s*;?\s*\n?)?[ \t]*\}?\s*;\s*\n/gm,
    "",
  );

  // ────────────────────────────────────────────────
  // Write result
  // ────────────────────────────────────────────────
  if (src !== original) {
    writeFileSync(filePath, src, "utf8");
    totalFixed++;
    const remaining = [...src.matchAll(/mousePos(?:ition)?(?!\w)/g)];
    if (remaining.length > 0) {
      console.log(
        `  FIXED but ⚠ ${remaining.length} leftover reference(s) — needs manual check`,
      );
      warnings.push(file);
    } else {
      console.log(`  FIXED ✓`);
    }
  } else {
    console.log(`  NO CHANGE — needs manual review`);
    warnings.push(file);
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Total fixed: ${totalFixed}`);
if (warnings.length) {
  console.log(`\nFiles needing manual review:`);
  warnings.forEach((f) => console.log(`  - ${f}`));
}
console.log();
