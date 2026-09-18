// vizarch — Visual regression test
// Generates SVGs from all templates and compares against golden files.
// Run: bun run test
// First run (generates golden files): bun run tests/visual-regression.test.ts -- --update

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { generateDiagram } from "../src/lib/vizarch/diagram-service";

const GOLDEN_DIR = join(import.meta.dir, "..", "tests", "golden");
const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";
const SKIP = "\x1b[33mSKIP\x1b[0m";

const TEMPLATES = [
  "serverless-aws",
  "microservices-gke",
  "monolith-aws",
  "fullstack-nextjs",
  "k8s-platform",
  "event-driven-aws",
];

const STYLES = [
  { layout: "horizontal" as const, theme: "light" as const },
  { layout: "vertical" as const, theme: "dark" as const },
];

async function main() {
  const update = process.argv.includes("--update");
  if (!existsSync(GOLDEN_DIR)) mkdirSync(GOLDEN_DIR, { recursive: true });

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const tplId of TEMPLATES) {
    for (const style of STYLES) {
      const name = `${tplId}-${style.layout}-${style.theme}`;
      const goldenPath = join(GOLDEN_DIR, `${name}.svg`);

      try {
        const result = await generateDiagram({
          templateId: tplId,
          style,
          useCache: false,
        });

        if (update || !existsSync(goldenPath)) {
          writeFileSync(goldenPath, result.svg);
          console.log(`${SKIP} ${name} — golden file ${update ? "updated" : "created"}`);
          skipped++;
          continue;
        }

        const golden = readFileSync(goldenPath, "utf-8");
        if (golden === result.svg) {
          console.log(`${PASS} ${name}`);
          passed++;
        } else {
          console.log(`${FAIL} ${name} — SVG differs from golden file`);
          // Save actual for diff
          writeFileSync(join(GOLDEN_DIR, `${name}.actual.svg`), result.svg);
          failed++;
        }
      } catch (err) {
        console.log(`${FAIL} ${name} — error: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
