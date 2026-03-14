import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';
let fixCount = 0;

// Fix specific files with known issues

// 1. Fix calculatorType -> calculatorKey that were missed
const typeToKey = [
  'ThermalActions.tsx',
  'TimberConnection.tsx',
  'TrafficActions.tsx',
  'RCSlabBending.tsx',
];

for (const file of typeToKey) {
  const filePath = path.join(calcsDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/calculatorType="/g, 'calculatorKey="');
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed calculatorType in: ${file}`);
    fixCount++;
  }
}

// 2. Fix CutFillVolumes - no status property
const cutFillPath = path.join(calcsDir, 'CutFillVolumes.tsx');
if (fs.existsSync(cutFillPath)) {
  let content = fs.readFileSync(cutFillPath, 'utf8');
  content = content.replace(/status=\{results\?\.status\}/g, 'status={undefined}');
  fs.writeFileSync(cutFillPath, content);
  console.log('Fixed CutFillVolumes');
  fixCount++;
}

// 3. Fix LoadCombinations - no status property
const loadCombPath = path.join(calcsDir, 'LoadCombinations.tsx');
if (fs.existsSync(loadCombPath)) {
  let content = fs.readFileSync(loadCombPath, 'utf8');
  content = content.replace(/status=\{results\?\.status\}/g, 'status={undefined}');
  content = content.replace(/status=\{null\}/g, 'status={undefined}');
  fs.writeFileSync(loadCombPath, content);
  console.log('Fixed LoadCombinations');
  fixCount++;
}

// 4. Fix WindLoad - no status property
const windLoadPath = path.join(calcsDir, 'WindLoad.tsx');
if (fs.existsSync(windLoadPath)) {
  let content = fs.readFileSync(windLoadPath, 'utf8');
  content = content.replace(/status=\{results\?\.status\}/g, 'status={undefined}');
  content = content.replace(/status=\{null\}/g, 'status={undefined}');
  fs.writeFileSync(windLoadPath, content);
  console.log('Fixed WindLoad');
  fixCount++;
}

// 5. Fix PileCapacity - no status property
const pileCapPath = path.join(calcsDir, 'PileCapacity.tsx');
if (fs.existsSync(pileCapPath)) {
  let content = fs.readFileSync(pileCapPath, 'utf8');
  content = content.replace(/status=\{results\?\.status\}/g, 'status={undefined}');
  fs.writeFileSync(pileCapPath, content);
  console.log('Fixed PileCapacity');
  fixCount++;
}

// 6. Fix RCBeam - null vs undefined
const rcBeamPath = path.join(calcsDir, 'RCBeam.tsx');
if (fs.existsSync(rcBeamPath)) {
  let content = fs.readFileSync(rcBeamPath, 'utf8');
  content = content.replace(
    /status=\{results\?\.status \|\| null\}/g,
    'status={(results?.status ?? undefined) as "PASS" | "FAIL" | undefined}',
  );
  content = content.replace(/"PASS" \| "FAIL" \| null/g, '"PASS" | "FAIL" | undefined');
  fs.writeFileSync(rcBeamPath, content);
  console.log('Fixed RCBeam');
  fixCount++;
}

// 7. Fix BasePlate - null vs undefined
const basePlatePath = path.join(calcsDir, 'BasePlate.tsx');
if (fs.existsSync(basePlatePath)) {
  let content = fs.readFileSync(basePlatePath, 'utf8');
  content = content.replace(/"PASS" \| "FAIL" \| null/g, '"PASS" | "FAIL" | undefined');
  fs.writeFileSync(basePlatePath, content);
  console.log('Fixed BasePlate');
  fixCount++;
}

console.log(`\nFixed ${fixCount} files`);
