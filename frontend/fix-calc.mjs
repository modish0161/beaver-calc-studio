import fs from 'fs';
import path from 'path';

const calcsDir = './src/pages/calculators';
const files = fs.readdirSync(calcsDir).filter((f) => f.endsWith('.tsx'));

let fixedCount = 0;
const fixes = {};

function findStatusProperty(content) {
  // Look through Results interface for status-like property
  const match = content.match(/interface\s+\w*Results?\w*\s*\{([^}]+)\}/s);
  if (match) {
    const body = match[1];
    if (body.includes('overallStatus:')) return 'overallStatus';
    if (/\bstatus\s*:/.test(body)) return 'status';
  }
  // Fallback - check setResults calls
  if (content.includes('overallStatus:')) return 'overallStatus';
  return 'status';
}

for (const file of files) {
  const filePath = path.join(calcsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const fileFixList = [];

  const statusProp = findStatusProperty(content);

  // Fix 1: SaveRunButton with wrong props
  content = content.replace(
    /<SaveRunButton\s+calculatorId="([^"]+)"\s+inputData=\{([^}]+)\}\s*\/>/g,
    (_, id, data) => {
      fileFixList.push('SaveRunButton');
      return `<SaveRunButton calculatorKey="${id}" inputs={${data} as unknown as Record<string, string | number>} results={results} status={results?.${statusProp}} />`;
    },
  );

  // Fix 2: Bad status expressions from previous fix attempts
  content = content.replace(
    /status=\{results\?\.\w+ \?\? results\?\.\w+\}/g,
    `status={results?.${statusProp}}`,
  );

  // Fix 3: status as 'PASS' | 'FAIL' patterns
  content = content.replace(
    /status=\{\(?results\?\.(?:status|overallStatus)\s+as\s+'PASS'\s*\|\s*'FAIL'\)?\}/g,
    `status={results?.${statusProp}}`,
  );

  // Fix 4: Add whatIfSliders if missing
  if (content.includes('sliders={whatIfSliders}') && !content.includes('const whatIfSliders')) {
    const formMatch = content.match(/interface\s+(\w*Form\w*)\s*\{([^}]+)\}/);
    let fields = [];
    if (formMatch) {
      fields =
        formMatch[2]
          .match(/\b(\w+)\??:\s*string/g)
          ?.slice(0, 4)
          .map((m) => m.match(/(\w+)\??:/)[1]) || [];
    }
    if (fields.length === 0) fields = ['value1', 'value2'];

    const sliders = fields.map((f) => {
      const label = f.replace(/([A-Z])/g, ' $1').trim();
      return `    { key: '${f}', label: '${label.charAt(0).toUpperCase() + label.slice(1)}', min: 0, max: 100, step: 1, unit: '' }`;
    });

    const code = `\n  // What-If sliders\n  const whatIfSliders = [\n${sliders.join(',\n')}\n  ];\n`;
    const insertPoint = content.match(/const \[form, setForm\][^;]+;/);
    if (insertPoint) {
      content = content.replace(insertPoint[0], insertPoint[0] + code);
      fileFixList.push('whatIfSliders');
    }
  }

  // Fix 5: Add updateForm if missing
  if (content.includes('updateForm={updateForm}') && !/const updateForm\s*=/.test(content)) {
    const formTypeMatch = content.match(/const \[form, setForm\] = useState<(\w+)>/);
    const formType = formTypeMatch ? formTypeMatch[1] : 'FormData';

    const code = `\n  // What-If helper\n  const updateForm = (field: keyof ${formType}, value: string | boolean) => {\n    setForm((prev) => ({ ...prev, [field]: value as string }));\n  };\n`;
    const insertPoint = content.match(/const \[form, setForm\][^;]+;/);
    if (insertPoint) {
      content = content.replace(insertPoint[0], insertPoint[0] + code);
      fileFixList.push('updateForm');
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    fixes[file] = fileFixList;
    fixedCount++;
  }
}

console.log(`Fixed ${fixedCount} files`);
Object.entries(fixes).forEach(([f, list]) => console.log(`  ${f}: ${list.join(', ') || 'status'}`));
