const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const calcDir = 'c:/Users/Matty/Desktop/BEAVER CALC STUDIO BRIEF/structural-engineer-calculator/frontend/src/pages/calculators';
const files = fs.readdirSync(calcDir).filter(f => f.endsWith('.tsx'));

let totalFixed = 0;

function getError(content) {
  try {
    transformSync(content, { loader: 'tsx', jsx: 'preserve' });
    return null;
  } catch (e) {
    return e.errors?.[0] || null;
  }
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
    const errText = err.text || '';
    if (!errLine) break;
    
    const lineIdx = errLine - 1;
    const lineContent = lines[lineIdx]?.trim();
    const indent = lines[lineIdx]?.match(/^(\s*)/)?.[1] || '';
    
    let handled = false;
    
    // Unexpected ")" - stray ) or )} - remove line
    if (errText === 'Unexpected ")"') {
      // Check if the error line has )} or just )
      if (lineContent === ')}' || lineContent === ')') {
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    // "}" is not valid inside a JSX element 
    else if (errText.includes('"}" is not valid inside a JSX')) {
      if (lineContent === ')}' || lineContent === '}') {
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    // tag mismatch - insert closing
    else if (errText.includes('does not match opening')) {
      const openTag = errText.match(/opening "(\w[\w.]*)" tag/)?.[1];
      const closeTag = errText.match(/closing "(\w[\w.]*)" tag/)?.[1];
      
      if (!openTag || !closeTag) break;
      
      // If closing doesn't match opening, insert the correct closing for the opening
      if (openTag === 'motion.div') {
        lines.splice(lineIdx, 0, indent + '  </motion.div>', indent + '  )}');
        handled = true;
      } else if (openTag === 'div') {
        lines.splice(lineIdx, 0, indent + '  </div>');
        handled = true;
      } else if (openTag === 'Card') {
        lines.splice(lineIdx, 0, indent + '</Card>');
        handled = true;
      } else if (openTag === 'CardContent') {
        lines.splice(lineIdx, 0, indent + '</CardContent>');
        handled = true;
      } else if (openTag === 'AnimatePresence') {
        // Stray closing tag before </AnimatePresence>
        if (lineContent?.startsWith('</')) {
          lines.splice(lineIdx, 1);
          handled = true;
        }
      }
    }
    // Expected identifier but found "/" 
    else if (errText.includes('Expected identifier but found "/"')) {
      if (lineContent?.startsWith('</') || lineContent === ')}') {
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    // Unterminated regular expression
    else if (errText.includes('Unterminated regular expression')) {
      if (lineContent?.startsWith('</') || lineContent === ')}') {
        lines.splice(lineIdx, 1);
        handled = true;
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
      console.log(`${file}: PARTIAL (${attempts}) - ${remaining.text} at L${remaining.location?.line}`);
    } else {
      console.log(`${file}: FIXED (${attempts})`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal fully fixed: ${totalFixed}`);
