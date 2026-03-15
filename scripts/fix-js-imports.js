import fs from "fs";
import path from "path";

const outDir = process.env.OUT_DIR || "dist";
const extensions = [".js"];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.includes(path.extname(entry.name))) continue;

    let text = fs.readFileSync(fullPath, "utf8");
    const original = text;

    // ESM static import
    text = text.replace(/(from\s+["'])(\.\/?[^\"'\n]+?)(["'])/g, (match, p1, spec, p3) => {
      if (spec.startsWith("./") || spec.startsWith("../")) {
        if (!path.extname(spec) && !spec.endsWith("/")) {
          return `${p1}${spec}.js${p3}`;
        }
      }
      return match;
    });

    // dynamic import()
    text = text.replace(/(import\(\s*["'])(\.\/?[^\"'\n]+?)(["']\s*\))/g, (match, p1, spec, p3) => {
      if (spec.startsWith("./") || spec.startsWith("../")) {
        if (!path.extname(spec) && !spec.endsWith("/")) {
          return `${p1}${spec}.js${p3}`;
        }
      }
      return match;
    });

    if (text !== original) {
      fs.writeFileSync(fullPath, text, "utf8");
      console.log(`Patched imports in: ${fullPath}`);
    }
  }
}

walk(path.resolve(outDir));
console.log("Import-path patch complete.");
