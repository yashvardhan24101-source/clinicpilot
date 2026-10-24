import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Production Code Isolation Check: No Test Helpers in Production Code", () => {
  it("verifies that test-auth-helper and test utilities are NEVER imported by production files under src/", () => {
    const srcDir = path.resolve(__dirname, "../../"); // points to src/
    const allFiles = getAllFiles(srcDir);

    // Filter to production source files only (exclude src/tests/)
    const productionFiles = allFiles.filter(
      (f) => !f.includes(path.normalize("/tests/")) && !f.includes(path.normalize("\\tests\\"))
    );

    expect(productionFiles.length).toBeGreaterThan(10);

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of productionFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (
          /from\s+["'].*test-auth-helper.*["']/.test(line) ||
          /require\(["'].*test-auth-helper.*["']\)/.test(line) ||
          /from\s+["'].*\/tests\/.*["']/.test(line) ||
          /require\(["'].*\/tests\/.*["']\)/.test(line)
        ) {
          violations.push({
            file: path.relative(srcDir, file),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error("Test helper imported into production code:", violations);
    }

    expect(violations).toEqual([]);
  });
});
