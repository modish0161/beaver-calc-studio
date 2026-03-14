const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const calcDir = 'c:/Users/Matty/Desktop/BEAVER CALC STUDIO BRIEF/structural-engineer-calculator/frontend/src/pages/calculators';
const files = fs.readdirSync(calcDir).filter(f => f.endsWith('.tsx'));

let totalFixed = 0;

function hasError(content) {
  try {
    transformSync(content, { loader: 'tsx', jsx: 'preserve' });
    return null;
  } catch (e) {
    return e.errors?.[0] || { text: String(e) };
  }
}

for (const file of files) {
  let content = fs.readFileSync(path.join(calcDir, file), 'utf-8');
  let err = hasError(content);
  if (!err) continue;
  
  let lines = content.split('\n');
  let modified = false;
  let attempts = 0;
  
  while (err && attempts < 80) {
    attempts++;
    const errLine = err.location?.line;
    const errText = err.text || '';
    
    if (!errLine) break;
    
    // Strategy: "}" not valid inside JSX element - remove the offending )} line
    if (errText.includes('is not valid inside a JSX element') && errText.includes('"}"')) {
      const lineIdx = errLine - 1;
      const lineContent = lines[lineIdx]?.trim();
      if (lineContent === ')}' || lineContent === '}') {
        lines.splice(lineIdx, 1);
        modified = true;
      } else {
        break;
      }
    }
    // Unterminated regular expression - usually means a stray /
    // Often happens after fixing other issues - look for </something> on that line
    else if (errText.includes('Unterminated regular expression')) {
      // Check if the problem line has a stray closing tag
      const lineIdx = errLine - 1;
      const lineContent = lines[lineIdx]?.trim();
      // If it's a stray </div> or </Card> etc, it might be from over-insertion
      if (lineContent?.startsWith('</') || lineContent === ')}') {
        lines.splice(lineIdx, 1);
        modified = true;
      } else {
        break;
      }
    }
    // </AnimatePresence> doesn't match opening <motion.div>
    else if (errText.includes('"AnimatePresence" tag does not match opening "motion.div"')) {
      const apLine = errLine - 1;
      const indent = lines[apLine].match(/^(\s*)/)?.[1] || '        ';
      lines.splice(apLine, 0, indent + '  </motion.div>', indent + '  )}');
      modified = true;
    }
    // </motion.div> doesn't match opening <AnimatePresence>
    else if (errText.includes('"motion.div" tag does not match opening "AnimatePresence"')) {
      // Stray </motion.div> that should just be removed
      const lineIdx = errLine - 1;
      const lineContent = lines[lineIdx]?.trim();
      if (lineContent === '</motion.div>') {
        lines.splice(lineIdx, 1);
        modified = true;
      } else {
        break;
      }
    }
    // </div> doesn't match opening <motion.div>
    else if (errText.includes('"div" tag does not match opening "motion.div"') ||
             errText.includes('"Card" tag does not match opening "motion.div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '            ';
      lines.splice(problemLine, 0, indent + '  </motion.div>', indent + '  )}');
      modified = true;
    }
    // </CardContent> doesn't match opening <div>
    else if (errText.includes('"CardContent" tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // </div> doesn't match opening <CardContent>
    else if (errText.includes('"div" tag does not match opening "CardContent"')) {
      // Missing </CardContent> before </div>
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '</CardContent>');
      modified = true;
    }
    // </motion.div> doesn't match opening <div>
    else if (errText.includes('"motion.div" tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // </motion.div> doesn't match opening <CardContent>
    else if (errText.includes('"motion.div" tag does not match opening "CardContent"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '</CardContent>');
      modified = true;
    }
    // </CollapsibleSection> or </SectionWrapper> doesn't match opening <div>
    else if (errText.includes('tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '            ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // Expected ">" but found "<"  
    else if (errText.includes('Expected ">" but found "<"')) {
      break; // complex issue
    }
    else if (errText.includes('Unexpected "}"')) {
      const lineIdx = errLine - 1;
      const lineContent = lines[lineIdx]?.trim();
      if (lineContent === '};') {
        // This is the component closing - means there's an extra } somewhere
        break;
      }
      break;
    }
    else {
      break;
    }
    
    content = lines.join('\n');
    err = hasError(content);
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(path.join(calcDir, file), content);
    const remaining = hasError(content);
    if (remaining) {
      console.log(`${file}: PARTIAL (${attempts} ops) - ${remaining.text} at L${remaining.location?.line}`);
    } else {
      console.log(`${file}: FIXED (${attempts} ops)`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal fully fixed: ${totalFixed}`);
