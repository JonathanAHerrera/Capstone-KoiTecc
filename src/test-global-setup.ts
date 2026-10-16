import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Native SQLite statements can retain Windows handles until their worker process exits.
// Delete only this run's unique fixture directory after all workers have shut down.
export default async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), "koitecc-tests-"));
  process.env.CMMC_TEST_TEMP_ROOT = directory;
  return async () => {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    delete process.env.CMMC_TEST_TEMP_ROOT;
  };
}
