/**
 * fix-wrapper-divs.mjs
 *
 * Restores outer container divs that were incorrectly eaten by the
 * mouse-spotlight migration script. Also removes orphaned </div> tags.
 *
 * Run from frontend/: node fix-wrapper-divs.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dir = join(process.cwd(), "src", "pages", "calculators");
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
let fixed = 0;

for (const file of files) {
  const fp = join(dir, file);
  let src = readFileSync(fp, "utf8");

  // Only fix files where MouseSpotlight is the root return element
  if (!/return\s*\(\s*\n\s*<MouseSpotlight\s*\/>/.test(src)) continue;

  let lines = src.split("\n");

  // Find the MouseSpotlight line that's the root element
  let msLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*<MouseSpotlight\s*\/>/.test(lines[i])) {
      // Check if previous non-empty line is `return (`
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].trim() === "") continue;
        if (/return\s*\(/.test(lines[j])) {
          msLine = i;
        }
        break;
      }
      if (msLine !== -1) break;
    }
  }
  if (msLine === -1) continue;

  // Step 1: Add outer container div before MouseSpotlight
  const indent = lines[msLine].match(/^(\s*)/)[1];
  lines.splice(
    msLine,
    0,
    indent + '<div className="relative min-h-screen overflow-hidden">',
  );
  // Now MouseSpotlight is at msLine+1, indent it
  lines[msLine + 1] = indent + "  <MouseSpotlight />";

  src = lines.join("\n");

  // Step 2: Count div balance to determine excess closes
  lines = src.split("\n");

  // Find the LAST return statement's return block
  let returnStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*return\s*\(/.test(lines[i])) {
      returnStart = i;
      break;
    }
  }
  if (returnStart === -1) continue;

  // Find matching closing )
  let returnEnd = -1;
  let parens = 0;
  for (let i = returnStart; i < lines.length; i++) {
    for (const c of lines[i]) {
      if (c === "(") parens++;
      if (c === ")") {
        parens--;
        if (parens === 0) {
          returnEnd = i;
          break;
        }
      }
    }
    if (returnEnd !== -1) break;
  }
  if (returnEnd === -1) returnEnd = lines.length - 1;

  // Count div balance in return block
  const returnBlock = lines.slice(returnStart, returnEnd + 1).join("\n");
  const opens = (returnBlock.match(/<div[\s>]/g) || []).length;
  const closes = (returnBlock.match(/<\/div>/g) || []).length;
  const selfCloses = (returnBlock.match(/<div[^>]*\/>/g) || []).length;
  const netOpens = opens - selfCloses;
  let excess = closes - netOpens;

  // Step 3: Remove orphaned </div> tags
  if (excess > 0) {
    // Find the MouseSpotlight line in current source
    let spotLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*<MouseSpotlight\s*\/>/.test(lines[i])) {
        spotLine = i;
        break;
      }
    }

    // Walk forward from MouseSpotlight, tracking div nesting
    // Remove </div> tags that would make nesting go negative
    let depth = 0;
    let removed = 0;
    for (let i = spotLine + 1; i < returnEnd && removed < excess; i++) {
      const line = lines[i];
      const lineText = line.trim();

      // Count opens (non-self-closing) on this line
      const lineOpens = (line.match(/<div[\s>]/g) || []).length;
      const lineSelfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
      const lineNetOpens = lineOpens - lineSelfCloses;
      const lineCloses = (line.match(/<\/div>/g) || []).length;

      depth += lineNetOpens;

      // Check if this close would go negative (orphaned)
      for (let c = 0; c < lineCloses; c++) {
        if (depth <= 0 && lineText === "</div>") {
          // This is an orphaned </div> - remove the line
          lines.splice(i, 1);
          removed++;
          returnEnd--;
          i--;
          break;
        }
        depth--;
      }
    }

    src = lines.join("\n");
  }

  writeFileSync(fp, src);
  fixed++;
  console.log(
    `${file}: FIXED (removed ${excess > 0 ? excess : 0} orphaned </div>)`,
  );
}

console.log(`\nTotal fixed: ${fixed}`);
