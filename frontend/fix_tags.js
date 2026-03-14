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

function getErrorLine(content) {
  const err = hasError(content);
  return err?.location?.line || null;
}

for (const file of files) {
  let content = fs.readFileSync(path.join(calcDir, file), 'utf-8');
  let err = hasError(content);
  if (!err) continue;
  
  const lines = content.split('\n');
  let modified = false;
  let attempts = 0;
  
  while (err && attempts < 50) {
    attempts++;
    const errLine = err.location?.line;
    const errText = err.text || '';
    
    if (!errLine) break;
    
    // Strategy 1: Missing </motion.div> and )} before </AnimatePresence>
    // Error: </AnimatePresence> doesn't match opening <motion.div>
    if (errText.includes('"AnimatePresence" tag does not match opening "motion.div"')) {
      // Insert </motion.div> and )} before the </AnimatePresence> line
      const apLine = errLine - 1; // 0-indexed
      const indent = lines[apLine].match(/^(\s*)/)?.[1] || '        ';
      lines.splice(apLine, 0, indent + '  </motion.div>', indent + '  )}');
      modified = true;
    }
    // Strategy 2: </div> doesn't match opening <motion.div> 
    // Missing </motion.div> + )} before the </div>
    else if (errText.includes('"div" tag does not match opening "motion.div"') ||
             errText.includes('"Card" tag does not match opening "motion.div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '            ';
      lines.splice(problemLine, 0, indent + '  </motion.div>', indent + '  )}');
      modified = true;
    }
    // Strategy 3: </CardContent> doesn't match opening <div>
    // Missing </div> before </CardContent>
    else if (errText.includes('"CardContent" tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // Strategy 4: </motion.div> doesn't match opening <div>
    // Missing </div> before </motion.div>
    else if (errText.includes('"motion.div" tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '              ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // Strategy 5: </Section> doesn't match opening <div>
    else if (errText.includes('"Section" tag does not match opening "div"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '            ';
      lines.splice(problemLine, 0, indent + '  </div>');
      modified = true;
    }
    // Strategy 6: </div> doesn't match opening <AnimatePresence>
    else if (errText.includes('"div" tag does not match opening "AnimatePresence"')) {
      const problemLine = errLine - 1;
      const indent = lines[problemLine].match(/^(\s*)/)?.[1] || '        ';
      lines.splice(problemLine, 0, indent + '</AnimatePresence>');
      // Actually this means AnimatePresence was not properly closed
      // Let me insert )} and </AnimatePresence> before the </div>
      // Remove what we just added
      lines.splice(problemLine, 1);
      lines.splice(problemLine, 0, indent + '  )}', indent + '</AnimatePresence>');
      modified = true;
    }
    // Strategy for "}" not valid inside JSX - usually after a )} was removed
    else if (errText.includes('is not valid inside a JSX element')) {
      // Skip - this usually resolves after fixing the tag issue above
      break;
    }
    else if (errText.includes('Unexpected "}"') || errText.includes('Unterminated')) {
      break;
    }
    else {
      // Unknown error type
      console.log(`${file}: UNKNOWN ERROR at line ${errLine}: ${errText}`);
      break;
    }
    
    // Re-check
    content = lines.join('\n');
    err = hasError(content);
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(path.join(calcDir, file), content);
    const remaining = hasError(content);
    if (remaining) {
      console.log(`${file}: PARTIALLY fixed (${attempts} insertions) - remaining: ${remaining.text} at line ${remaining.location?.line}`);
    } else {
      console.log(`${file}: FIXED (${attempts} insertions)`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal fully fixed: ${totalFixed}`);
