import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Unit tests for the pure logic that survived the migration untouched —
 * pagination token maths and the blog block helpers. Component tests are
 * deliberately out of scope: the end-to-end HTML assertions in the migration
 * report cover rendering far more meaningfully than a jsdom snapshot would.
 */
export default defineConfig({
  test: { environment: "node", include: ["**/*.test.ts"], exclude: ["node_modules/**", ".next/**"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
