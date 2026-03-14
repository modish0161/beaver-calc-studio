/**
 * Bulk-add input validation to all calculator pages that lack it.
 *
 * For each file:
 *   1. Add `import { validateNumericInputs } from '../../lib/validation';`
 *   2. Parse FormData defaults to build VALIDATION_RULES
 *   3. Insert a validateInputs() function
 *   4. Inject a validation guard at the top of the calculate/run function
 *
 * Run:  node add-validation.mjs
 */

import fs from 'fs';
import path from 'path';

const DIR = path.resolve('src/pages/calculators');

/* Fields that are NOT numeric (skip them in validation) */
const NON_NUMERIC = new Set([
  'projectName',
  'reference',
  'project',
  'ref',
  'notes',
  'description',
  'name',
  'slabType',
  'supportCondition',
  'columnType',
  'bracing',
  'facingType',
  'concreteGrade',
  'steelGrade',
  'gradeOfConcrete',
  'gradeOfSteel',
  'inputMethod',
  'soilType',
  'operationType',
  'loadType',
  'load_type',
  'structureType',
  'designSituation',
  'roofType',
  'terrainCategory',
  'sectionSize',
  'beam_section',
  'steel_grade',
  'lug_type',
  'memberType',
  'endCondition',
  'loadCase',
  'wallType',
  'category',
  'method',
  'type',
  'unit',
  'units',
  'profile',
  'section',
  'sectionType',
  'memberSection',
  'beamSection',
  'connectionType',
  'boltGrade',
  'plateGrade',
  'weldType',
  'timberGrade',
  'serviceClass',
  'loadDurationClass',
  'exposureClass',
  'cementClass',
  'aggregateType',
  'pileType',
  'soilCondition',
  'installationMethod',
  'bearingType',
  'padShape',
  'bridgeType',
  'deckType',
  'surfaceType',
  'surfacingType',
  'parapetType',
  'fenceType',
  'hoardingType',
  'matType',
  'gridType',
  'analysisType',
  'vehicleType',
  'trafficType',
  'windZone',
  'importanceClass',
  'consequenceClass',
  'lateralSystem',
  'foundationType',
  'standardCode',
  'designCode',
  'code',
]);

/* These keys commonly allow zero or negative */
const ALLOW_ZERO_KEYS = new Set([
  'load_offset',
  'eccentricity',
  'offset',
  'accidentalLoad',
  'temperatureChange',
  'temperatureDelta',
  'temperature_load',
  'momentZ',
  'momentY',
  'moment',
  'lateralForce',
  'roofPitch',
  'slopeAngle',
  'inclination',
  'nailInclination',
]);

const ALLOW_NEGATIVE_KEYS = new Set(['temperatureChange', 'temperatureDelta', 'temperature_load']);

/* Files that already have validation — skip */
const HAS_VALIDATION = new Set([
  'Abutments.tsx',
  'BearingReactions.tsx',
  'CompositeBeam.tsx',
  'DeckSlab.tsx',
  'Grillage.tsx',
  'MemberRatings.tsx',
  'PierDesign.tsx',
  'PileFoundations.tsx',
  'Sensitivity.tsx',
  'SteelPlateGirder.tsx',
  'ThermalActions.tsx',
  'TrafficActions.tsx',
  'TransverseMembers.tsx',
  'WindActions.tsx',
  // Added by first run of this script:
  'AnchorBolt.tsx',
  'CantileverWall.tsx',
  'FinPlate.tsx',
  'GRSWall.tsx',
  'GabionWall.tsx',
  'GeogridDesign.tsx',
  'GravityWall.tsx',
  'GroundAnchor.tsx',
  'GroundMats.tsx',
  'GuardrailChecks.tsx',
  'LegatoWall.tsx',
  'LoadCombinations.tsx',
  'NeedleBeam.tsx',
  'NegativeSkinFriction.tsx',
  'RCColumn.tsx',
  'RCSlab.tsx',
  'SheetPile.tsx',
  'SlopeStability.tsx',
  'SoilNail.tsx',
  'SteelColumnAxial.tsx',
  'TemporaryParapet.tsx',
  'WindLoad.tsx',
  // Added by second run:
  'AccessRamps.tsx',
  'BasePlate.tsx',
  'Batters.tsx',
  'BogMats.tsx',
  'BoltPattern.tsx',
  'BoltedConnection.tsx',
  'Bracing.tsx',
  'CombinedLoading.tsx',
  'CompositeQuick.tsx',
  'CrackWidth.tsx',
  'CranePadDesign.tsx',
  'ElastomericBearings.tsx',
  'EndPlate.tsx',
  'ErectionStages.tsx',
  'HerasFence.tsx',
  'Hoarding.tsx',
  'LTBCheck.tsx',
  'LegatoQuantity.tsx',
  'LiftLoadSheet.tsx',
  'MovementJoints.tsx',
  'NotionalWind.tsx',
  'PunchingShear.tsx',
  'RCBeam.tsx',
  'ShearStuds.tsx',
  'SixF2Quantity.tsx',
  'SpreaderBeam.tsx',
  'SteelBeamBending.tsx',
  'TimberMember.tsx',
  'TimberQuantity.tsx',
  'WeldSizing.tsx',
]);

function toLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isNumericDefault(val) {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  // Match numbers like '3.5', '0', '-2.0', '100'
  return /^-?\d+(\.\d+)?$/.test(s);
}

function extractFormFields(src) {
  // Match const [form, setForm] = useState<FormData>({ ... });
  // or const [formData, setFormData] = useState<FormData>({ ... });
  // Also handle useCallback-wrapped patterns
  const formPatterns = [
    /const \[(form), setForm\]\s*=\s*useState(?:<\w+>)?\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\)/s,
    /const \[(formData), setFormData\]\s*=\s*useState(?:<\w+>)?\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\)/s,
  ];

  let varName = null;
  let body = null;
  for (const pat of formPatterns) {
    const m = src.match(pat);
    if (m) {
      varName = m[1];
      body = m[2];
      break;
    }
  }
  if (!varName) return null;

  const fields = [];
  // Extract simple key: 'value' pairs (skip arrays/objects)
  const fieldRe = /(\w+):\s*'([^']*)'/g;
  let m;
  while ((m = fieldRe.exec(body)) !== null) {
    const [, key, defaultVal] = m;
    if (NON_NUMERIC.has(key)) continue;
    // Include empty defaults (user must fill in) and numeric defaults
    if (defaultVal !== '' && !isNumericDefault(defaultVal)) continue;
    fields.push({ key, defaultVal });
  }
  return { varName, fields };
}

function findCalcFunction(src) {
  // Find the main calculate function — various patterns
  const patterns = [
    /const (calculate)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (runCalculation)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (runAnalysis)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (calculateResults)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (runCalc)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (calculatePileCapacity)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
    /const (performCalculation)\s*=\s*(?:useCallback\s*\()?(?:\(\)|[^=])*(?:=>)?\s*\{/,
  ];
  for (const pat of patterns) {
    const m = src.match(pat);
    if (m) return m[1];
  }
  return null;
}

function hasUseEffectCalc(src) {
  // Check if calculation is in useEffect (auto-calc pattern)
  return /useEffect\(\(\) => \{[\s\S]{10,200}(setResults|setResult)\(/m.test(src);
}

let modified = 0;
let skipped = 0;
let errors = [];

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.tsx'))
  .sort();

for (const file of files) {
  if (HAS_VALIDATION.has(file)) {
    skipped++;
    continue;
  }

  const filePath = path.join(DIR, file);
  let src = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has validation import
  if (src.includes('validateNumericInputs')) {
    skipped++;
    continue;
  }

  const formInfo = extractFormFields(src);
  if (!formInfo || formInfo.fields.length === 0) {
    console.log(`⏭  ${file} — no parseable numeric form fields`);
    skipped++;
    continue;
  }

  const calcFunc = findCalcFunction(src);
  const isAutoCalc = !calcFunc && hasUseEffectCalc(src);

  if (!calcFunc && !isAutoCalc) {
    console.log(`⏭  ${file} — no calculate function found`);
    skipped++;
    continue;
  }

  // 1. Add import statement
  const importLine = "import { validateNumericInputs } from '../../lib/validation';";
  // Insert after last import
  const lastImportIdx = src.lastIndexOf('\nimport ');
  if (lastImportIdx === -1) {
    console.log(`⏭  ${file} — no imports found`);
    skipped++;
    continue;
  }
  const endOfLastImport = src.indexOf('\n', src.indexOf(';', lastImportIdx));
  if (endOfLastImport === -1) {
    skipped++;
    continue;
  }
  src = src.slice(0, endOfLastImport + 1) + importLine + '\n' + src.slice(endOfLastImport + 1);

  // 2. Build VALIDATION_RULES array
  const rulesStr = formInfo.fields
    .map((f) => {
      const parts = [`key: '${f.key}'`, `label: '${toLabel(f.key)}'`];
      if (ALLOW_ZERO_KEYS.has(f.key)) parts.push('allowZero: true');
      if (ALLOW_NEGATIVE_KEYS.has(f.key)) parts.push('allowNegative: true');
      return `  { ${parts.join(', ')} }`;
    })
    .join(',\n');

  // 3. Build validateInputs function
  const formVar = formInfo.varName;
  const validateFn = `
  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(${formVar} as unknown as Record<string, unknown>, [
${rulesStr},
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };`;

  // Some files use string[] warnings, some use Warning[] — check the type
  const usesWarningObj = /setWarnings\(\[?\{/.test(src) || /type: 'error'.*message:/.test(src);
  const usesStringWarnings = /setWarnings\(\[([^{]|$)/.test(src) && !usesWarningObj;

  let validateFnFinal;
  if (usesStringWarnings) {
    validateFnFinal = `
  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(${formVar} as unknown as Record<string, unknown>, [
${rulesStr},
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };`;
  } else {
    validateFnFinal = validateFn;
  }

  // Insert validateInputs after the form state declaration
  // Find the closing of useState<FormData>
  const formStateRe = new RegExp(`const \\[${formVar},`);
  const formStateMatch = src.match(formStateRe);
  if (!formStateMatch) {
    console.log(`⏭  ${file} — could not locate form state`);
    skipped++;
    continue;
  }

  // Find next line that starts with '  const ' or '  //' after form state, to insert before it
  const formStateIdx = src.indexOf(formStateMatch[0]);
  // Find the closing });  of the useState
  let braceDepth = 0;
  let foundStart = false;
  let insertIdx = -1;
  for (let i = formStateIdx; i < src.length; i++) {
    if (src[i] === '(' && !foundStart) {
      foundStart = true;
      braceDepth = 1;
      continue;
    }
    if (!foundStart) continue;
    if (src[i] === '(' || src[i] === '{') braceDepth++;
    if (src[i] === ')' || src[i] === '}') braceDepth--;
    if (braceDepth === 0) {
      // Find next newline after the semicolon
      const semi = src.indexOf(';', i);
      insertIdx = src.indexOf('\n', semi) + 1;
      break;
    }
  }

  if (insertIdx <= 0) {
    console.log(`⏭  ${file} — could not find form state end`);
    skipped++;
    continue;
  }

  src = src.slice(0, insertIdx) + validateFnFinal + '\n' + src.slice(insertIdx);

  // 4. Inject validation guard in calculate function
  if (calcFunc) {
    // Find the function and its first opening brace
    const calcRe = new RegExp(
      `const ${calcFunc}\\s*=\\s*(?:useCallback\\s*\\()?\\s*(?:\\([^)]*\\)|\\(\\))\\s*(?:=>)?\\s*\\{`,
    );
    const calcMatch = src.match(calcRe);
    if (calcMatch) {
      const calcIdx = src.indexOf(calcMatch[0]);
      const openBrace = calcIdx + calcMatch[0].length - 1;
      // Insert after opening brace
      const nextNewline = src.indexOf('\n', openBrace);
      const guard = '\n    if (!validateInputs()) return;';
      src = src.slice(0, nextNewline) + guard + src.slice(nextNewline);
    } else {
      console.log(`⚠  ${file} — could not inject guard into ${calcFunc}`);
    }
  }
  // For auto-calc useEffect, we skip injecting since it auto-runs

  fs.writeFileSync(filePath, src, 'utf-8');
  modified++;
  console.log(
    `✅ ${file} — added validation (${formInfo.fields.length} fields${calcFunc ? `, guard in ${calcFunc}` : ', auto-calc'})`,
  );
}

console.log(`\nDone: ${modified} modified, ${skipped} skipped, ${errors.length} errors`);
