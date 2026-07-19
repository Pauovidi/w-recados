import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve("base44", "functions");

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  }));
  return nested.flat();
}

const files = await collectTypeScriptFiles(root);
const errors = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });

  for (const diagnostic of result.diagnostics || []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    errors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
  }
}

if (errors.length) {
  throw new Error(errors.join("\n"));
}

console.log(`${files.length} Base44 TypeScript files parsed.`);
