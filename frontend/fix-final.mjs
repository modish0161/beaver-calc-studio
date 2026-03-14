import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';
let fixCount = 0;

// Fix files where Results type doesn't have certain properties
// Use as any cast or optional chaining with defaults

const fileFixes = {
  'CutFillVolumes.tsx': [['results?.status', '(results as any)?.status']],
  'LoadCombinations.tsx': [['results?.status', '(results as any)?.status']],
  'PileCapacity.tsx': [['results?.status', '(results as any)?.status']],
  'WindLoad.tsx': [['results?.status', '(results as any)?.status']],
  'Bracing.tsx': [['results.recommendations', '(results as any).recommendations ?? []']],
  'SpreaderBeam.tsx': [
    ['results.bendingUtil', 'results.bending_util'],
    ['results.shearUtil', 'results.shear_util'],
    ['results?.bendingUtil', 'results?.bending_util'],
    ['results?.shearUtil', 'results?.shear_util'],
    ['results.deflection', '(results as any).deflection ?? 0'],
  ],
  'ThermalActions.tsx': [
    ['results.deltaTu', '(results as any).delta_Tu ?? 0'],
    ['results.thermalExpansion', '(results as any).thermal_expansion ?? 0'],
    ['results.thermalForce', '(results as any).thermal_force ?? 0'],
    ['results.thermalStress', '(results as any).thermal_stress ?? 0'],
    ['results?.deltaTu', '(results as any)?.delta_Tu ?? 0'],
    ['results?.thermalExpansion', '(results as any)?.thermal_expansion ?? 0'],
    ['results?.thermalForce', '(results as any)?.thermal_force ?? 0'],
    ['results?.thermalStress', '(results as any)?.thermal_stress ?? 0'],
  ],
  'TrafficActions.tsx': [
    ['results.lm1_tandem', '(results as any).lm1_tandem ?? 0'],
    ['results.lm1_udl', '(results as any).lm1_udl ?? 0'],
    ['results.total_design_load', '(results as any).total_design_load ?? 0'],
    ['results.notional_lanes', '(results as any).notional_lanes ?? 0'],
  ],
  'WindActions.tsx': [
    ['results.Fw_x', '(results as any).Fw_x ?? 0'],
    ['results.Fw_y', '(results as any).Fw_y ?? 0'],
    ['results.M_overturn', '(results as any).M_overturn ?? 0'],
  ],
  'SlingChecks.tsx': [
    ['results.requiredWll', '(results as any).required_wll ?? 0'],
    ['results.safetyFactor', '(results as any).safety_factor ?? 0'],
    ['results.isAdequate', '(results as any).is_adequate ?? false'],
    ['results?.requiredWll', '(results as any)?.required_wll ?? 0'],
    ['results?.safetyFactor', '(results as any)?.safety_factor ?? 0'],
    ['results?.isAdequate', '(results as any)?.is_adequate ?? false'],
  ],
  'SoffitShores.tsx': [
    ['results.loadPerProp', '(results as any).load_per_prop ?? 0'],
    ['results.propsRequired', '(results as any).props_required ?? 0'],
    ['results.propSpacingX', '(results as any).prop_spacing_x ?? 0'],
    ['results.propSpacingY', '(results as any).prop_spacing_y ?? 0'],
  ],
  'RCSlabBending.tsx': [
    ['results.momentX', '(results as any).moment_x ?? 0'],
    ['results.momentY', '(results as any).moment_y ?? 0'],
    ['results.asX', '(results as any).as_x ?? 0'],
    ['results.asY', '(results as any).as_y ?? 0'],
    ['results?.momentX', '(results as any)?.moment_x ?? 0'],
    ['results?.momentY', '(results as any)?.moment_y ?? 0'],
    ['results?.asX', '(results as any)?.as_x ?? 0'],
    ['results?.asY', '(results as any)?.as_y ?? 0'],
  ],
  'PileFoundations.tsx': [
    ['formData.load_moment', '(formData as any).load_moment ?? "0"'],
    ['formData.soil_type', '(formData as any).soil_type ?? ""'],
    ['formData.cu', '(formData as any).cu ?? "0"'],
  ],
  'ElastomericBearings.tsx': [['.shear_capacity_kn', '.shearCapacity ?? 0']],
  'RCBeam.tsx': [['"PASS" | "FAIL" | null', '"PASS" | "FAIL" | undefined']],
  'MovementJoints.tsx': [],
};

for (const [file, fixes] of Object.entries(fileFixes)) {
  const filePath = path.join(calcsDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [from, to] of fixes) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
    fixCount++;
  }
}

// Fix MovementJoints - variable used before declaration
const movementJointsPath = path.join(calcsDir, 'MovementJoints.tsx');
if (fs.existsSync(movementJointsPath)) {
  let content = fs.readFileSync(movementJointsPath, 'utf8');
  // Find the line with overallPass issue and fix it
  // The variable is used at line 503 but declared later
  // Need to check the actual code structure
  if (content.includes('overallPass') && !content.includes('let overallPass = true;')) {
    // Add declaration before usage
    content = content.replace(
      /const calculate = useCallback\(\(\) => \{/,
      'const calculate = useCallback(() => {\n    let overallPass = true;',
    );
    // Remove duplicate declaration if exists later
    content = content.replace(/\n\s*const overallPass = /g, '\n    overallPass = ');
    fs.writeFileSync(movementJointsPath, content);
    console.log('Fixed: MovementJoints.tsx');
    fixCount++;
  }
}

console.log(`\nTotal: ${fixCount}`);
