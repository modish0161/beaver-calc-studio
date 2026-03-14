const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const calcDir = 'c:/Users/Matty/Desktop/BEAVER CALC STUDIO BRIEF/structural-engineer-calculator/frontend/src/pages/calculators';
const files = fs.readdirSync(calcDir).filter(f => f.endsWith('.tsx'));

const errors = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(calcDir, file), 'utf-8');
  try {
    transformSync(content, { loader: 'tsx', jsx: 'preserve' });
  } catch (e) {
    const firstErr = e.errors?.[0];
    if (firstErr) {
      errors.push(`${file}:${firstErr.location?.line}: ${firstErr.text}`);
    } else {
      errors.push(`${file}: ${e.message?.substring(0, 100)}`);
    }
  }
}

console.log(`Files with errors: ${errors.length}`);
errors.forEach(e => console.log(e));
