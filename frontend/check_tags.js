const fs = require('fs');
const path = require('path');

const calcDir = 'c:/Users/Matty/Desktop/BEAVER CALC STUDIO BRIEF/structural-engineer-calculator/frontend/src/pages/calculators';

const files = fs.readdirSync(calcDir).filter(f => f.endsWith('.tsx'));
const results = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(calcDir, file), 'utf-8');
  
  // Find AnimatePresence mode="wait" sections
  const apOpenIdx = content.lastIndexOf('<AnimatePresence mode="wait">');
  const apCloseIdx = content.lastIndexOf('</AnimatePresence>');
  
  if (apOpenIdx < 0 || apCloseIdx < 0 || apCloseIdx <= apOpenIdx) continue;
  
  const section = content.substring(apOpenIdx + '<AnimatePresence mode="wait">'.length, apCloseIdx);
  
  // Parse JSX tags with a simple stack
  const tagStack = [];
  const parenStack = [];
  let issues = [];
  
  // Find all JSX open/close tags and conditional opens/closes
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9.]*)\b[^>]*?(\/?)>/g;
  let match;
  while ((match = tagRegex.exec(section)) !== null) {
    const isClose = match[1] === '/';
    const tagName = match[2];
    const isSelfClose = match[3] === '/';
    
    if (isSelfClose) continue;
    
    if (isClose) {
      if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
        tagStack.pop();
      } else {
        issues.push(`Unexpected </${tagName}> (stack top: ${tagStack[tagStack.length-1] || 'empty'})`);
      }
    } else {
      tagStack.push(tagName);
    }
  }
  
  // Count conditional opens/closes
  const condOpens = (section.match(/&&\s*\(/g) || []).length + (section.match(/\?\s*\(/g) || []).length;
  const condCloses = (section.match(/\)\}/g) || []).length;
  
  if (tagStack.length > 0 || condOpens !== condCloses) {
    results.push({
      file,
      unclosedTags: [...tagStack],
      unclosedConds: condOpens - condCloses,
      issues
    });
  }
}

// Output
for (const r of results) {
  console.log(`${r.file}: unclosed tags=[${r.unclosedTags.join(', ')}] unclosed conds=${r.unclosedConds}`);
}
console.log(`\nTotal files with issues: ${results.length}`);
