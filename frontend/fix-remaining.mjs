import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';
const files = fs.readdirSync(calcsDir).filter((f) => f.endsWith('.tsx'));

let fixCount = 0;

for (const file of files) {
  const filePath = path.join(calcsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix 1: calculatorType -> calculatorKey in SaveRunButton
  content = content.replace(
    /<SaveRunButton calculatorType="([^"]+)"/g,
    '<SaveRunButton calculatorKey="$1"',
  );

  // Fix 2: null to undefined for status
  content = content.replace(
    /status=\{results\?\.(\w+) \|\| null\}/g,
    "status={(results?.$1 ?? undefined) as 'PASS' | 'FAIL' | undefined}",
  );

  // Fix 3: Type cast null results
  content = content.replace(
    /status=\{\(null\) as 'PASS' \| 'FAIL' \| undefined\}/g,
    'status={undefined}',
  );

  // Fix 4: Remove status prop when Results type has no status
  // This is for files where the Results interface genuinely has no status field

  // Fix 5: Fix project_name -> projectName
  content = content.replace(/formData\.project_name/g, 'formData.projectName');
  content = content.replace(/form\.project_name/g, 'form.projectName');

  // Fix 6: Fix snake_case result properties to camelCase
  const snakeToCamel = {
    required_wll: 'requiredWll',
    safety_factor: 'safetyFactor',
    is_adequate: 'isAdequate',
    load_per_prop: 'loadPerProp',
    props_required: 'propsRequired',
    prop_spacing_x: 'propSpacingX',
    prop_spacing_y: 'propSpacingY',
    load_moment: 'loadMoment',
    soil_type: 'soilType',
    shear_capacity_kn: 'shearCapacity',
    maxMoment: 'max_moment',
    maxShear: 'max_shear',
    thermal_expansion: 'thermalExpansion',
    delta_Tu: 'deltaTu',
    thermal_stress: 'thermalStress',
    thermal_force: 'thermalForce',
  };

  for (const [snake, camel] of Object.entries(snakeToCamel)) {
    // Only replace in property access contexts
    const regex = new RegExp(`results\\.${snake}(?!\\w)`, 'g');
    content = content.replace(regex, `results.${camel}`);
    const regex2 = new RegExp(`results\\?\\.${snake}(?!\\w)`, 'g');
    content = content.replace(regex2, `results?.${camel}`);
  }

  // Fix 7: Replace barDiameterX/Y which should be barDiameter
  content = content.replace(/formData\.barDiameterX/g, 'formData.barDiameter');
  content = content.replace(/formData\.barDiameterY/g, 'formData.barDiameter');

  // Fix 8: Fix doubled 'as unknown as'
  content = content.replace(/as unknown as unknown as/g, 'as unknown as');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
    fixCount++;
  }
}

console.log(`\nTotal: ${fixCount}`);
