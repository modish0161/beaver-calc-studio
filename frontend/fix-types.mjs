import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';
const files = fs.readdirSync(calcsDir).filter((f) => f.endsWith('.tsx'));

let fixCount = 0;

for (const file of files) {
  const filePath = path.join(calcsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix 1: Cast status to proper type
  // status={results?.status} -> status={results?.status as 'PASS' | 'FAIL' | undefined}
  // status={results?.overallStatus} -> status={results?.overallStatus as 'PASS' | 'FAIL' | undefined}
  content = content.replace(
    /status=\{results\?\.(status|overallStatus)\}/g,
    "status={results?.$1 as 'PASS' | 'FAIL' | undefined}",
  );

  // Fix 2: Handle null case
  content = content.replace(
    /status=\{results\?\.(status|overallStatus) as 'PASS' \| 'FAIL' \| undefined\}/g,
    "status={(results?.$1 ?? undefined) as 'PASS' | 'FAIL' | undefined}",
  );

  // Fix 3: Add type cast for form data in SaveRunButton inputs
  content = content.replace(/inputs=\{(\w+)\}/g, (match, varName) => {
    if (varName === 'results') return match;
    return `inputs={${varName} as unknown as Record<string, string | number>}`;
  });

  // Fix 4: Already has cast but needs double unknown
  content = content.replace(
    /inputs=\{(\w+) as Record<string, string \| number>\}/g,
    'inputs={$1 as unknown as Record<string, string | number>}',
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed types in: ${file}`);
    fixCount++;
  }
}

console.log(`\nTotal files fixed: ${fixCount}`);
