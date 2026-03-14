/**
 * Migration script: Add DOCX export to all calculator pages.
 *
 * For each calculator .tsx file:
 * 1. Add `import { generateDOCX } from '../../lib/docxGenerator';` (if not already present)
 * 2. Clone the exportPDF function as exportDOCX, replacing generatePremiumPDF → generateDOCX
 * 3. Add a DOCX button next to the existing PDF button
 */
const fs = require("fs");
const path = require("path");

const CALCS_DIR = path.join(
  __dirname,
  "frontend",
  "src",
  "pages",
  "calculators",
);

const files = fs.readdirSync(CALCS_DIR).filter((f) => f.endsWith(".tsx"));

let modified = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  const fp = path.join(CALCS_DIR, file);
  let src = fs.readFileSync(fp, "utf8");

  // Skip if already has generateDOCX
  if (src.includes("generateDOCX")) {
    skipped++;
    continue;
  }

  // Skip if no exportPDF function
  if (!src.includes("exportPDF")) {
    skipped++;
    continue;
  }

  let changed = false;

  // --- 1. Add import ---
  // Look for the pdfGenerator import line
  const pdfImportRe =
    /import\s*\{[^}]*generatePremiumPDF[^}]*\}\s*from\s*['"][^'"]*pdfGenerator['"]\s*;?/;
  const pdfMatch = src.match(pdfImportRe);
  if (pdfMatch) {
    const insertAfter = pdfMatch.index + pdfMatch[0].length;
    const importLine =
      "\nimport { generateDOCX } from '../../lib/docxGenerator';";
    src = src.slice(0, insertAfter) + importLine + src.slice(insertAfter);
    changed = true;
  } else {
    // Fallback: add after last import
    const lastImportIdx = src.lastIndexOf("import ");
    if (lastImportIdx !== -1) {
      const lineEnd = src.indexOf("\n", lastImportIdx);
      const importLine =
        "\nimport { generateDOCX } from '../../lib/docxGenerator';";
      src = src.slice(0, lineEnd) + importLine + src.slice(lineEnd);
      changed = true;
    }
  }

  // --- 2. Clone exportPDF as exportDOCX ---
  // Find `const exportPDF = () => {` or `const exportPDF = () =>\n{` or `function exportPDF()`
  // We need to find the entire function body by matching braces
  const fnStartRe = /const\s+exportPDF\s*=\s*\(\)\s*(?::\s*\w+\s*)?\s*=>\s*\{/;
  const fnMatch = src.match(fnStartRe);
  if (fnMatch) {
    const fnStart = fnMatch.index;
    // Find balanced closing brace
    let depth = 0;
    let fnEnd = -1;
    const openBraceIdx = fnStart + fnMatch[0].length - 1; // index of the '{'
    for (let i = openBraceIdx; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) {
          fnEnd = i;
          break;
        }
      }
    }
    if (fnEnd !== -1) {
      // Check for trailing semicolon
      let realEnd = fnEnd + 1;
      if (src[realEnd] === ";") realEnd++;

      const fnBody = src.slice(fnStart, realEnd);
      // Clone: rename exportPDF→exportDOCX, generatePremiumPDF→generateDOCX
      let docxFn = fnBody
        .replace(/const\s+exportPDF/, "const exportDOCX")
        .replace(/generatePremiumPDF/g, "generateDOCX");

      // Insert after the original function
      src = src.slice(0, realEnd) + "\n\n  " + docxFn + src.slice(realEnd);
      changed = true;
    }
  }

  // --- 3. Add DOCX button next to PDF button ---
  // Various patterns exist. We'll look for the Export PDF button and add a DOCX button after it.
  // The button is typically a <Button> or <button> with onClick={exportPDF} and text "Export PDF"
  //
  // Strategy: find the line that contains 'exportPDF' and 'Export PDF', grab through end of </Button> or </button>
  // Then duplicate it for DOCX.

  // Pattern A: <Button onClick={exportPDF} ...>...<FiDownload ... /> Export PDF</Button>
  // Pattern B: <Button onClick={exportPDF} ...>\n ... Export PDF\n</Button>
  // We'll use a regex that captures the full <Button> tag

  // Find button blocks containing exportPDF
  const buttonRe = /<Button\s+onClick=\{exportPDF\}[^>]*>[\s\S]*?<\/Button>/g;
  let btnMatch;
  const replacements = [];
  while ((btnMatch = buttonRe.exec(src)) !== null) {
    const original = btnMatch[0];
    // Create DOCX version
    let docxBtn = original
      .replace(/onClick=\{exportPDF\}/g, "onClick={exportDOCX}")
      .replace(/Export PDF( Report)?/g, "DOCX")
      .replace(
        /bg-blue-600 hover:bg-blue-700/g,
        "bg-indigo-600 hover:bg-indigo-700",
      )
      .replace(
        /bg-gradient-to-r from-[\w-]+ to-[\w-]+ hover:from-[\w-]+ hover:to-[\w-]+/g,
        "bg-indigo-600 hover:bg-indigo-700",
      );

    replacements.push({ original, docxBtn, index: btnMatch.index });
  }

  // Apply replacements in reverse order to preserve indices
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { original, docxBtn, index } = replacements[i];
    const endIdx = index + original.length;
    // Wrap both in a flex container if not already wrapped
    // But first check if parent already has flex
    const before = src.slice(Math.max(0, index - 60), index);
    const isAlreadyWrapped =
      before.includes("flex gap") ||
      before.includes("flex ") ||
      before.includes("gap-2");

    if (isAlreadyWrapped) {
      // Just insert the DOCX button after the PDF one
      src =
        src.slice(0, endIdx) + "\n            " + docxBtn + src.slice(endIdx);
    } else {
      // Wrap in a small flex container
      src =
        src.slice(0, index) +
        '<div className="flex gap-2 flex-wrap">\n              ' +
        original +
        "\n              " +
        docxBtn +
        "\n            </div>" +
        src.slice(endIdx);
    }
    changed = true;
  }

  // Handle lowercase <button> elements too
  const lcButtonRe =
    /<button\s+[^>]*onClick=\{[^}]*exportPDF[^}]*\}[^>]*>[\s\S]*?<\/button>/g;
  let lcBtnMatch;
  const lcReplacements = [];
  while ((lcBtnMatch = lcButtonRe.exec(src)) !== null) {
    const original = lcBtnMatch[0];
    let docxBtn = original
      .replace(/exportPDF/g, "exportDOCX")
      .replace(/Export PDF( Report)?/g, "DOCX")
      .replace(/bg-blue-600/g, "bg-indigo-600")
      .replace(/hover:bg-blue-700/g, "hover:bg-indigo-700");
    lcReplacements.push({ original, docxBtn, index: lcBtnMatch.index });
  }

  for (let i = lcReplacements.length - 1; i >= 0; i--) {
    const { original, docxBtn, index } = lcReplacements[i];
    const endIdx = index + original.length;
    src = src.slice(0, endIdx) + "\n            " + docxBtn + src.slice(endIdx);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fp, src, "utf8");
    modified++;
    console.log(`✓ ${file}`);
  } else {
    skipped++;
    console.log(`- ${file} (no changes needed)`);
  }
}

console.log(`\nDone: ${modified} modified, ${skipped} skipped`);
if (errors.length) console.log("Errors:", errors);
