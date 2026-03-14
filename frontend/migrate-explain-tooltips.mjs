/**
 * Migration script: Add ExplainableLabel to all remaining calculator files.
 * Run: node migrate-explain-tooltips.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const calcDir = join(import.meta.dirname, "src/pages/calculators");

// Files already done
const alreadyDone = new Set([
  "SteelBeamBending.tsx",
  "RCBeam.tsx",
  "BoltedConnection.tsx",
  "BasePlate.tsx",
  "CrackWidth.tsx",
  "PadFootingBearing.tsx",
  "PileFoundations.tsx",
  "SheetPile.tsx",
  "RCSlab.tsx",
  "SteelColumnAxial.tsx",
  "FinPlate.tsx",
  "CompositeBeam.tsx",
]);

// Files that don't have InputField and are too unique to auto-migrate
const skipFiles = new Set(["MovementJoints.bak.tsx"]);

let modified = 0;
let skipped = 0;
let errors = [];

function addImport(content, importLine) {
  // Add after last import line
  const lines = content.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s/) || lines[i].match(/^}\s*from\s/)) {
      lastImportIdx = i;
    }
    // Stop searching after significant non-import content
    if (i > 50) break;
  }
  if (lastImportIdx === -1) return content;
  lines.splice(lastImportIdx + 1, 0, importLine);
  return lines.join("\n");
}

function processFile(filename) {
  const filepath = join(calcDir, filename);
  let content = readFileSync(filepath, "utf-8");

  if (
    content.includes("ExplainableLabel") ||
    content.includes("ExplainTooltip")
  ) {
    return "already-done";
  }

  // Detect pattern
  const hasInputFieldKeyof = /const InputField[\s\S]{0,200}field:\s*keyof/.test(
    content,
  );
  const hasInputFieldString =
    /const InputField[\s\S]{0,200}field:\s*string/.test(content);
  const hasInputFieldValueOnChange =
    /const InputField[\s\S]{0,200}value[\s\S]{0,100}onChange/.test(content);
  const hasInputFieldsArray = /const inputFields\s*=\s*\[/.test(content);

  let changed = false;

  if (hasInputFieldKeyof) {
    // Pattern A: has field: keyof FormData
    // Just replace the label with ExplainableLabel
    content = addImport(
      content,
      "import ExplainableLabel from '../../components/ExplainableLabel';",
    );

    // Find the label in InputField and replace it
    // Common patterns:
    // <label className="text-sm text-gray-400">{label}</label>
    // <label className="text-sm text-slate-400">{label}</label>
    const labelPatterns = [
      {
        find: /<label className="text-sm text-gray-400">\{label\}<\/label>/g,
        replace: "<ExplainableLabel label={label} field={field} />",
      },
      {
        find: /<label className="text-sm text-slate-400">\{label\}<\/label>/g,
        replace:
          '<ExplainableLabel label={label} field={field} className="text-sm text-slate-400" />',
      },
      {
        find: /<label className="text-\[10px\] font-black text-gray-500 uppercase tracking-widest">\{label\}<\/label>/g,
        replace:
          '<ExplainableLabel label={label} field={field} className="text-[10px] font-black text-gray-500 uppercase tracking-widest" />',
      },
    ];

    for (const { find, replace } of labelPatterns) {
      if (find.test(content)) {
        content = content.replace(find, replace);
        changed = true;
        break;
      }
    }

    if (!changed) {
      // Try a more generic match - label with any className containing {label}
      const genericLabel = /<label className="([^"]*)">\{label\}<\/label>/;
      const match = content.match(genericLabel);
      if (match) {
        const cls = match[1];
        // Only replace within InputField context (first occurrence near const InputField)
        content = content.replace(
          genericLabel,
          `<ExplainableLabel label={label} field={field} className="${cls}" />`,
        );
        changed = true;
      }
    }
  } else if (hasInputFieldString) {
    // Pattern C: has field: string
    content = addImport(
      content,
      "import ExplainableLabel from '../../components/ExplainableLabel';",
    );

    const labelPatterns = [
      {
        find: /<label className="block text-sm text-slate-400 mb-1">\{label\}\s*\{unit && <span className="text-xs">\(\{unit\}\)<\/span>\}<\/label>/g,
        replace:
          '<div className="flex items-center gap-1.5 mb-1"><ExplainableLabel label={label} field={field} className="text-sm text-slate-400" /> {unit && <span className="text-xs text-slate-400">({unit})</span>}</div>',
      },
      {
        find: /<label className="block text-sm text-slate-400 mb-1">\{label\}<\/label>/g,
        replace:
          '<ExplainableLabel label={label} field={field} className="text-sm text-slate-400" />',
      },
      {
        find: /<label className="text-sm text-gray-400">\{label\}<\/label>/g,
        replace: "<ExplainableLabel label={label} field={field} />",
      },
      {
        find: /<label className="text-sm text-slate-400">\{label\}<\/label>/g,
        replace:
          '<ExplainableLabel label={label} field={field} className="text-sm text-slate-400" />',
      },
    ];

    for (const { find, replace } of labelPatterns) {
      if (find.test(content)) {
        content = content.replace(find, replace);
        changed = true;
        break;
      }
    }

    if (!changed) {
      const genericLabel =
        /<label className="([^"]*)">\{label\}(\s*\{unit[^}]*\})?<\/label>/;
      const match = content.match(genericLabel);
      if (match) {
        const cls = match[1];
        const unitPart = match[2] || "";
        if (unitPart) {
          content = content.replace(
            genericLabel,
            `<div className="flex items-center gap-1.5 mb-1"><ExplainableLabel label={label} field={field} className="${cls.replace("block ", "").replace(" mb-1", "")}" /> {unit && <span className="text-xs text-slate-400">({unit})</span>}</div>`,
          );
        } else {
          content = content.replace(
            genericLabel,
            `<ExplainableLabel label={label} field={field} className="${cls}" />`,
          );
        }
        changed = true;
      }
    }
  } else if (hasInputFieldValueOnChange) {
    // Pattern B: value/onChange, no field prop - need to add field prop
    content = addImport(
      content,
      "import ExplainableLabel from '../../components/ExplainableLabel';",
    );

    // Add field? prop to the InputField signature
    // Various signatures exist. Try common ones:

    // Type 1: const InputField = ({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit?: string })
    const sig1 =
      /const InputField\s*=\s*\(\{\s*label,\s*value,\s*onChange,\s*unit\s*\}\s*:\s*\{\s*label:\s*string;\s*value:\s*string;\s*onChange:\s*\(v:\s*string\)\s*=>\s*void;\s*unit\?:\s*string\s*\}\)/;
    if (sig1.test(content)) {
      content = content.replace(
        sig1,
        "const InputField = ({ label, value, onChange, unit, field }: { label: string; value: string; onChange: (v: string) => void; unit?: string; field?: string })",
      );
      changed = true;
    }

    // Type 2: React.FC<{ label: string; value: string; onChange: (v: string) => void; unit?: string; info?: string }> = ({ label, value, onChange, unit, info })
    if (!changed) {
      const sig2 =
        /const InputField:\s*React\.FC<\{([^}]*)\}>\s*=\s*\(\{([^}]*)\}\)/;
      const m2 = content.match(sig2);
      if (m2) {
        const typeStr = m2[1];
        const destructStr = m2[2];
        if (!typeStr.includes("field")) {
          const newType =
            typeStr.trimEnd() +
            (typeStr.trimEnd().endsWith(";") ? "" : ";") +
            " field?: string";
          const newDestruct =
            destructStr.trimEnd() +
            (destructStr.trimEnd().endsWith(",") ? "" : ",") +
            " field";
          content = content.replace(
            sig2,
            `const InputField: React.FC<{${newType}}> = ({${newDestruct}})`,
          );
          changed = true;
        }
      }
    }

    // Type 3: inline typed ({ label, value, onChange, unit }: { ... })
    if (!changed) {
      const sig3 = /const InputField\s*=\s*\(\{([^}]+)\}\s*:\s*\{([^}]+)\}\)/;
      const m3 = content.match(sig3);
      if (m3) {
        const destruct = m3[1];
        const types = m3[2];
        if (!types.includes("field")) {
          const newTypes =
            types.trimEnd() +
            (types.trimEnd().endsWith(";") ? "" : ";") +
            " field?: string";
          const newDestruct =
            destruct.trimEnd() +
            (destruct.trimEnd().endsWith(",") ? "" : ",") +
            " field";
          content = content.replace(
            sig3,
            `const InputField = ({${newDestruct}}: {${newTypes}})`,
          );
          changed = true;
        }
      }
    }

    if (changed) {
      // Now replace the label
      const labelReplacements = [
        {
          find: /<label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">\{label\}\s*\{unit && <span className="text-gray-600 text-xs">\(\{unit\}\)<\/span>\}<\/label>/g,
          replace:
            '<div className="flex items-center gap-1.5 mb-1"><ExplainableLabel label={label} field={field || label.toLowerCase().replace(/\\s+/g, \'_\')} className="text-xs text-gray-400 uppercase tracking-wider" /> {unit && <span className="text-gray-600 text-xs">({unit})</span>}</div>',
        },
        {
          find: /<label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">\{label\}<\/label>/g,
          replace:
            "<ExplainableLabel label={label} field={field || label.toLowerCase().replace(/\\s+/g, '_')} className=\"text-xs text-gray-400 uppercase tracking-wider\" />",
        },
        {
          find: /<label className="text-\[10px\] font-black text-gray-500 uppercase tracking-widest">\{label\}<\/label>/g,
          replace:
            "<ExplainableLabel label={label} field={field || label.toLowerCase().replace(/\\s+/g, '_')} className=\"text-[10px] font-black text-gray-500 uppercase tracking-widest\" />",
        },
      ];

      let labelChanged = false;
      for (const { find, replace } of labelReplacements) {
        if (find.test(content)) {
          content = content.replace(find, replace);
          labelChanged = true;
          break;
        }
      }

      if (!labelChanged) {
        // Generic label replacement for B-pattern
        const genericLabel =
          /<label className="([^"]*)">\{label\}(\s*\{unit[^<]*)?<\/label>/;
        const match = content.match(genericLabel);
        if (match) {
          const cls = match[1];
          const hasUnit = match[2] && match[2].includes("unit");
          if (hasUnit) {
            content = content.replace(
              genericLabel,
              `<div className="flex items-center gap-1.5 mb-1"><ExplainableLabel label={label} field={field || label.toLowerCase().replace(/\\s+/g, '_')} className="${cls.replace("block", "").replace(" mb-1", "").trim()}" /> {unit && <span className="text-gray-600 text-xs">({unit})</span>}</div>`,
            );
          } else {
            content = content.replace(
              genericLabel,
              `<ExplainableLabel label={label} field={field || label.toLowerCase().replace(/\\s+/g, '_')} className="${cls}" />`,
            );
          }
        }
      }
    }
  } else if (hasInputFieldsArray) {
    // Pattern D: data-driven with inputFields array
    content = addImport(
      content,
      "import { getFieldExplanation } from '../../data/fieldExplanations';",
    );
    content = addImport(
      content,
      "import ExplainTooltip from '../../components/ExplainTooltip';",
    );

    // For data-driven files, we add ExplainTooltip inline after the label text
    // Find patterns like: <span>{field.label}</span> and add tooltip after
    if (content.includes("{field.label}")) {
      content = content.replace(
        /(<span>\{field\.label\}<\/span>)/g,
        "$1\n                      {getFieldExplanation(field.key) && <ExplainTooltip {...getFieldExplanation(field.key)!} />}",
      );
      changed = true;
    }

    // Some D-pattern files use different label rendering
    if (!changed && content.includes("{input.label}")) {
      content = content.replace(
        /(<span>\{input\.label\}<\/span>)/g,
        "$1\n                      {getFieldExplanation(input.key) && <ExplainTooltip {...getFieldExplanation(input.key)!} />}",
      );
      changed = true;
    }
  } else {
    // Pattern E: no InputField, inline labels - skip these (too varied)
    return "skip-inline";
  }

  if (changed) {
    writeFileSync(filepath, content, "utf-8");
    return "modified";
  } else {
    return "no-change";
  }
}

// Process all files
const files = readdirSync(calcDir).filter((f) => f.endsWith(".tsx"));
const results = {
  modified: [],
  skipped: [],
  noChange: [],
  alreadyDone: [],
  error: [],
  skipInline: [],
};

for (const file of files) {
  if (alreadyDone.has(file) || skipFiles.has(file)) {
    results.alreadyDone.push(file);
    continue;
  }

  try {
    const result = processFile(file);
    if (result === "modified") results.modified.push(file);
    else if (result === "already-done") results.alreadyDone.push(file);
    else if (result === "skip-inline") results.skipInline.push(file);
    else results.noChange.push(file);
  } catch (e) {
    results.error.push(`${file}: ${e.message}`);
  }
}

console.log(`\n=== ExplainTooltip Migration Results ===`);
console.log(`Modified: ${results.modified.length}`);
results.modified.forEach((f) => console.log(`  ✓ ${f}`));
console.log(`Already done: ${results.alreadyDone.length}`);
console.log(`Skipped (inline): ${results.skipInline.length}`);
results.skipInline.forEach((f) => console.log(`  ⊘ ${f}`));
console.log(
  `No change (pattern matched but label not found): ${results.noChange.length}`,
);
results.noChange.forEach((f) => console.log(`  ? ${f}`));
console.log(`Errors: ${results.error.length}`);
results.error.forEach((e) => console.log(`  ✗ ${e}`));
