const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');
const calcDir = 'c:/Users/Matty/Desktop/BEAVER CALC STUDIO BRIEF/structural-engineer-calculator/frontend/src/pages/calculators';
const files = fs.readdirSync(calcDir).filter(f => f.endsWith('.tsx'));
let totalFixed = 0;

function getError(content) {
  try { transformSync(content, { loader: 'tsx', jsx: 'preserve' }); return null; }
  catch (e) { return e.errors?.[0] || null; }
}

for (const file of files) {
  let content = fs.readFileSync(path.join(calcDir, file), 'utf-8');
  let err = getError(content);
  if (!err) continue;
  
  let lines = content.split('\n');
  let modified = false;
  let attempts = 0;
  
  while (err && attempts < 100) {
    attempts++;
    const errLine = err.location?.line;
    const errCol = err.location?.column;
    const errText = err.text || '';
    if (!errLine) break;
    
    const lineIdx = errLine - 1;
    const lineContent = lines[lineIdx] || '';
    const trimmed = lineContent.trim();
    let handled = false;
    
    // Unexpected ")" - remove the ) at the error position
    if (errText === 'Unexpected ")"') {
      if (trimmed === ')' || trimmed === ')}' || trimmed === ');') {
        lines.splice(lineIdx, 1);
        handled = true;
      } else if (errCol !== undefined) {
        // Remove the ) at the specific column
        const before = lineContent.substring(0, errCol);
        const after = lineContent.substring(errCol + 1);
        if (after.trim() === '' || after.trim() === ';') {
          lines.splice(lineIdx, 1); // Remove whole line if nothing meaningful remains
          handled = true;
        } else {
          lines[lineIdx] = before + after;
          handled = true;
        }
      }
    }
    // "}" not valid in JSX — find and remove the stray } or )} 
    else if (errText.includes('"}" is not valid inside a JSX element')) {
      if (trimmed === ')}' || trimmed === '}' || trimmed === '};') {
        lines.splice(lineIdx, 1);
        handled = true;
      } else if (errCol !== undefined) {
        // Check if the } is at the column position
        const ch = lineContent[errCol];
        if (ch === '}') {
          // Check if it's part of )}
          if (errCol > 0 && lineContent[errCol - 1] === ')') {
            const before = lineContent.substring(0, errCol - 1);
            const after = lineContent.substring(errCol + 1);
            if (before.trim() === '' && after.trim() === '') {
              lines.splice(lineIdx, 1);
            } else {
              lines[lineIdx] = before + after;
            }
            handled = true;
          } else {
            const before = lineContent.substring(0, errCol);
            const after = lineContent.substring(errCol + 1);
            if (before.trim() === '' && after.trim() === '') {
              lines.splice(lineIdx, 1);
            } else {
              lines[lineIdx] = before + after;
            }
            handled = true;
          }
        }
      }
    }
    // Expected ">" but found "<" — PileFoundations specific
    else if (errText.includes('Expected ">" but found "<"')) {
      // This usually means a malformed JSX tag. Look at the line
      // Try removing the line if it looks like a stray
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<!')) {
        break; // Complex issue, skip
      }
      break;
    }
    // Tag mismatches — same as before
    else if (errText.includes('does not match opening')) {
      const openTag = errText.match(/opening "(\w[\w.]*)" tag/)?.[1];
      if (openTag === 'motion.div') {
        const indent = lineContent.match(/^(\s*)/)?.[1] || '';
        lines.splice(lineIdx, 0, indent + '  </motion.div>', indent + '  )}');
        handled = true;
      } else if (openTag === 'div') {
        const indent = lineContent.match(/^(\s*)/)?.[1] || '';
        lines.splice(lineIdx, 0, indent + '  </div>');
        handled = true;
      } else if (openTag === 'AnimatePresence') {
        if (trimmed.startsWith('</')) {
          lines.splice(lineIdx, 1);
          handled = true;
        }
      } else {
        break;
      }
    }
    
    if (!handled) break;
    modified = true;
    content = lines.join('\n');
    err = getError(content);
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(path.join(calcDir, file), content);
    const remaining = getError(content);
    if (remaining) {
      console.log(`${file}: PARTIAL (${attempts}) - ${remaining.text} at L${remaining.location?.line}:${remaining.location?.column}`);
    } else {
      console.log(`${file}: FIXED (${attempts})`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal fixed: ${totalFixed}`);
