import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';

// Files that use formData instead of form
const formDataFiles = [
  'CutFillVolumes.tsx', // uses settings actually
  'ExcavationSheetPile.tsx',
  'Falsework.tsx',
  'FormworkPressure.tsx',
  'HolePatternDXF.tsx',
  'PadFootingBearing.tsx',
  'RCSlabBending.tsx',
  'SlingAngle.tsx',
  'SlingChecks.tsx',
  'SoffitShores.tsx',
  'SweptPath.tsx',
  'ThermalActions.tsx',
  'TimberConnection.tsx',
  'Trackmats.tsx',
  'TrafficActions.tsx',
  'WindActions.tsx',
  'WorkingArea.tsx',
];

// Get actual form variable info from file
function getFormInfo(content) {
  // Find first useState that looks like form data
  const patterns = [
    /const \[(form), setForm\] = useState<(\w+)>/,
    /const \[(formData), setFormData\] = useState<(\w+)>/,
    /const \[(settings), setSettings\] = useState<(\w+)>/,
    /const \[(inputs), setInputs\] = useState<(\w+)>/,
    /const \[(vehicle), setVehicle\] = useState<(\w+)>/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return {
        varName: match[1],
        typeName: match[2],
        setterName: 'set' + match[1].charAt(0).toUpperCase() + match[1].slice(1),
      };
    }
  }
  return null;
}

function findStatusProperty(content) {
  const match = content.match(/interface\s+\w*Results?\w*\s*\{([^}]+)\}/s);
  if (match) {
    const body = match[1];
    if (body.includes('overallStatus:')) return 'overallStatus';
    if (/\bstatus\s*:/.test(body)) return 'status';
  }
  if (content.includes('overallStatus:')) return 'overallStatus';
  return 'status';
}

const files = fs.readdirSync(calcsDir).filter((f) => f.endsWith('.tsx'));
let fixCount = 0;

for (const file of files) {
  const filePath = path.join(calcsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const formInfo = getFormInfo(content);
  if (!formInfo) continue;

  const statusProp = findStatusProperty(content);

  // Replace form -> correct variable in SaveRunButton and WhatIfPreview
  if (formInfo.varName !== 'form') {
    content = content.replace(
      /inputs=\{form as unknown as Record<string, string \| number>\}/g,
      `inputs={${formInfo.varName} as unknown as Record<string, string | number>}`,
    );
    content = content.replace(/form=\{form\}/g, `form={${formInfo.varName}}`);
  }

  // Add updateForm if missing
  if (content.includes('updateForm={updateForm}') && !/const updateForm\s*=/.test(content)) {
    const code = `\n  // What-If helper\n  const updateForm = (field: keyof ${formInfo.typeName}, value: string | boolean | number) => {\n    ${formInfo.setterName}((prev: ${formInfo.typeName}) => ({ ...prev, [field]: value }));\n  };\n`;

    const insertPattern = new RegExp(
      `const \\[${formInfo.varName}, ${formInfo.setterName}\\][^;]+;`,
    );
    const insertPoint = content.match(insertPattern);
    if (insertPoint) {
      content = content.replace(insertPoint[0], insertPoint[0] + code);
    }
  }

  // Add whatIfSliders if missing
  if (content.includes('sliders={whatIfSliders}') && !content.includes('const whatIfSliders')) {
    // Find fields from form type
    const typeMatch = content.match(new RegExp(`interface ${formInfo.typeName}\\s*\\{([^}]+)\\}`));
    let sliderFields = [];
    if (typeMatch) {
      sliderFields = [...typeMatch[1].matchAll(/(\w+)\??:\s*string/g)].slice(0, 4).map((m) => m[1]);
    }
    if (sliderFields.length === 0) sliderFields = ['param1', 'param2'];

    const slidersCode = sliderFields
      .map((f) => {
        const label = f.replace(/([A-Z])/g, ' $1').trim();
        return `    { key: '${f}', label: '${label.charAt(0).toUpperCase() + label.slice(1)}', min: 0, max: 100, step: 1, unit: '' }`;
      })
      .join(',\n');

    const sliders = `\n  // What-If sliders\n  const whatIfSliders = [\n${slidersCode}\n  ];\n`;

    const insertPattern = new RegExp(
      `const \\[${formInfo.varName}, ${formInfo.setterName}\\][^;]+;`,
    );
    const insertPoint = content.match(insertPattern);
    if (insertPoint) {
      content = content.replace(insertPoint[0], insertPoint[0] + sliders);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file} (${formInfo.varName})`);
    fixCount++;
  }
}

console.log(`\nTotal files fixed: ${fixCount}`);
