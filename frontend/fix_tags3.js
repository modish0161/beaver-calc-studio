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
    
    // Expected ")" but found "{" - means )} is needed above
    if (errText.includes('Expected ")" but found "{"')) {
      lines.splice(lineIdx, 0, indent + ')}');
      handled = true;
    }
    // Expected "}" but found ";" - same, need )} above
    else if (errText.includes('Expected "}" but found ";"')) {
      lines.splice(lineIdx, 0, indent + ')}');
      handled = true;
    }
    // Expected identifier but found "/" - stray closing tag
    else if (errText.includes('Expected identifier but found "/"')) {
      // The line before should be a closing tag or )} - remove the stray
      if (lineContent?.startsWith('</') || lineContent === ')}' || lineContent === '}') {
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    // </div> vs <AnimatePresence>  
    else if (errText.includes('"div" tag does not match opening "AnimatePresence"')) {
      // Extra </div> - remove it
      if (lineContent === '</div>') {
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    // </motion.div> vs <Card> or CardContent
    else if (errText.includes('does not match opening "Card"') || 
             errText.includes('does not match opening "CardContent"')) {
      // Missing </Card> or </CardContent> before this line
      if (errText.includes('opening "Card"')) {
        lines.splice(lineIdx, 0, indent + '</Card>');
      } else {
        lines.splice(lineIdx, 0, indent + '</CardContent>');
      }
      handled = true;
    }
    // </AnimatePresence> vs <motion.div>
    else if (errText.includes('"AnimatePresence" tag does not match opening "motion.div"')) {
      lines.splice(lineIdx, 0, indent + '  </motion.div>', indent + '  )}');
      handled = true;
    }
    // </div> vs <motion.div>
    else if (errText.includes('"div" tag does not match opening "motion.div"')) {
      lines.splice(lineIdx, 0, indent + '  </motion.div>', indent + '  )}');
      handled = true;
    }
    // </Card> vs <motion.div>
    else if (errText.includes('"Card" tag does not match opening "motion.div"')) {
      lines.splice(lineIdx, 0, indent + '  </motion.div>', indent + '  )}');
      handled = true;
    }
    // </motion.div> vs <div>
    else if (errText.includes('"motion.div" tag does not match opening "div"')) {
      lines.splice(lineIdx, 0, indent + '  </div>');
      handled = true;
    }
    // </CardContent> vs <div>
    else if (errText.includes('"CardContent" tag does not match opening "div"')) {
      lines.splice(lineIdx, 0, indent + '  </div>');
      handled = true;
    }
    // '"}" is not valid'
    else if (errText.includes('"}" is not valid inside a JSX')) {
      if (lineContent === ')}' || lineContent === '}') {
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
    // Unexpected "}"
    else if (errText.includes('Unexpected "}"')) {
      if (lineContent === '};' || lineContent === '}') {
        // Might be end of component — check if it's the actual default export nearby
        const nextFewLines = lines.slice(lineIdx + 1, lineIdx + 5).join('\n');
        if (nextFewLines.includes('export default')) {
          break; // This is the real component end
        }
        // Otherwise remove stray
        lines.splice(lineIdx, 1);
        handled = true;
      }
    }
    
    if (!handled) {
      break;
    }
    
    modified = true;
    content = lines.join('\n');
    err = getError(content);
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(path.join(calcDir, file), content);
    const remaining = getError(content);
    if (remaining) {
      console.log(`${file}: PARTIAL (${attempts} ops) - ${remaining.text} at L${remaining.location?.line}`);
    } else {
      console.log(`${file}: FIXED (${attempts} ops)`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal fully fixed this pass: ${totalFixed}`);
