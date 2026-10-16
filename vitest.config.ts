import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Native libSQL handles need process isolation for reliable Windows teardown.
    pool: "forks",
    globalSetup: ["./src/test-global-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Tests that touch the SQLite file must not run in parallel against the same DB path.
    fileParallelism: false,
  },
});
