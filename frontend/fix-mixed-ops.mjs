import fs from 'fs';
import path from 'path';

const calcDir = 'src/pages/calculators';

const files = fs.readdirSync(calcDir).filter((f) => f.endsWith('.tsx'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(calcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern: (results as any).prop ?? 0?.toFixed(N) || '-'
  // Should be: ((results as any).prop ?? 0).toFixed(N)
  content = content.replace(
    /\(results as any\)\.(\w+) \?\? 0\?\.toFixed\((\d+)\) \|\| '-'/g,
    '((results as any).$1 ?? 0).toFixed($2)',
  );

  // Pattern: (results as any).prop ?? 0?.toFixed(N)
  // Should be: ((results as any).prop ?? 0).toFixed(N)
  content = content.replace(
    /\(results as any\)\.(\w+) \?\? 0\?\.toFixed\((\d+)\)/g,
    '((results as any).$1 ?? 0).toFixed($2)',
  );

  // Pattern: (results as any).recommendations ?? []?.map(...)
  // Should be: ((results as any).recommendations ?? []).map(...)
  content = content.replace(
    /\(results as any\)\.recommendations \?\? \[\]\?\.map/g,
    '((results as any).recommendations ?? []).map',
  );

  // Pattern: results.prop ?? 0?.toFixed(N) || '-'
  // Should be: (results.prop ?? 0).toFixed(N)
  content = content.replace(
    /results\.(\w+) \?\? 0\?\.toFixed\((\d+)\) \|\| '-'/g,
    '(results.$1 ?? 0).toFixed($2)',
  );

  // Pattern: results.prop ?? 0?.toFixed(N)
  // Should be: (results.prop ?? 0).toFixed(N)
  content = content.replace(
    /results\.(\w+) \?\? 0\?\.toFixed\((\d+)\)/g,
    '(results.$1 ?? 0).toFixed($2)',
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    totalFixed++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`Total fixed: ${totalFixed}`);
