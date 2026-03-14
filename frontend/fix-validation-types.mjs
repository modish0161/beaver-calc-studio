import fs from 'fs';
import path from 'path';

const calcDir = path.join('src', 'pages', 'calculators');

// Files with string[] warnings that got wrong format from the script
const typeFixFiles = [
  'AccessRamps.tsx',
  'BasePlate.tsx',
  'Batters.tsx',
  'BogMats.tsx',
  'Bracing.tsx',
  'CombinedLoading.tsx',
  'CompositeQuick.tsx',
  'CrackWidth.tsx',
  'ErectionStages.tsx',
  'LegatoQuantity.tsx',
  'LiftLoadSheet.tsx',
  'LTBCheck.tsx',
  'NotionalWind.tsx',
  'PunchingShear.tsx',
  'RCBeam.tsx',
  'ShearStuds.tsx',
  'SixF2Quantity.tsx',
  'SteelBeamBending.tsx',
  'TimberMember.tsx',
  'TimberQuantity.tsx',
];

// Files without setWarnings state at all
const noWarningsFiles = ['BoltPattern.tsx', 'HolePatternDXF.tsx'];

let fixed = 0;

const allFiles = [...typeFixFiles, ...noWarningsFiles];

for (const file of allFiles) {
  const filePath = path.join(calcDir, file);
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;

  // Replace: setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
  // With: setWarnings(errs);
  code = code.replace(
    /setWarnings\(errs\.map\(e\s*=>\s*\(\{\s*type:\s*'error'\s*as\s*const,\s*message:\s*e\s*\}\)\)\)/g,
    'setWarnings(errs)',
  );

  if (code !== original) {
    fs.writeFileSync(filePath, code);
    console.log(`Fixed ${file}`);
    fixed++;
  } else {
    console.log(`⚠️ No match in ${file}`);
  }
}

console.log(`\nDone. Fixed ${fixed} files.`);
