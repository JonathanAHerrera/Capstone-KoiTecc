import { mkdirSync, openSync, closeSync, writeFileSync, readFileSync, existsSync, unlinkSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { formatTestStatus, type QualityCheck, type TestStatusReport } from "../src/lib/test-status-report";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const output = path.join(root, "data", "test-status");
mkdirSync(output, { recursive: true });
const lock = path.join(output, "run.lock");
if (existsSync(lock)) {
  const pid = Number(readFileSync(lock, "utf8"));
  let alive = true;
  try { process.kill(pid, 0); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false; }
  if (alive) throw new Error("Another quality run is still active. No duplicate run or email was started.");
  unlinkSync(lock);
}
const handle = openSync(lock, "wx");
writeFileSync(handle, String(process.pid));
closeSync(handle);

function tool(packageName: string, entry: string) {
  return path.join(path.dirname(require.resolve(`${packageName}/package.json`)), entry);
}
function git(...args: string[]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : "unavailable";
}

try {
  const startedAt = new Date().toISOString();
  const id = startedAt.replace(/[:.]/g, "-");
  const directory = path.join(output, id);
  mkdirSync(directory);
  const fixture = mkdtempSync(path.join(directory, "fixtures-"));
  const testJson = path.join(directory, "vitest.json");
  const steps = [
    { name: "Regression and integration tests", command: [tool("vitest", "vitest.mjs"), "run", "--reporter=json", `--outputFile=${testJson}`] },
    { name: "TypeScript", command: [tool("typescript", "bin/tsc"), "--noEmit"] },
    { name: "ESLint", command: [tool("eslint", "bin/eslint.js")] },
    { name: "Production build", command: [tool("next", "dist/bin/next"), "build"] },
    { name: "End-to-end data smoke test (mock AI)", command: [tool("tsx", "dist/cli.mjs"), "scripts/smoke.ts"], smoke: true },
  ];
  const checks: QualityCheck[] = [];
  for (const [index, step] of steps.entries()) {
    console.log(`Running ${step.name}...`);
    const start = Date.now();
    const result = spawnSync(process.execPath, step.command, {
      cwd: root, encoding: "utf8", windowsHide: true, timeout: 8 * 60_000, maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env, ANTHROPIC_API_KEY: "", BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
        CMMC_DB_PATH: path.join(fixture, "smoke.db"), CMMC_UPLOADS_DIR: path.join(fixture, "uploads"),
      },
    });
    const logFile = `${index + 1}.log`;
    writeFileSync(path.join(directory, logFile), `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error?.message ?? ""}`);
    checks.push({ name: step.name, passed: result.status === 0 && !result.error, durationSeconds: Math.round((Date.now() - start) / 1000), logFile });
  }
  let tests: TestStatusReport["tests"] = null;
  if (existsSync(testJson)) {
    const result = JSON.parse(readFileSync(testJson, "utf8"));
    tests = {
      passed: result.numPassedTests, failed: result.numFailedTests, skipped: result.numPendingTests,
      suitesPassed: result.numPassedTestSuites, suitesFailed: result.numFailedTestSuites,
      failures: (result.testResults ?? []).flatMap((suite: { assertionResults?: { status: string; fullName: string }[]; status: string; name: string }) => {
        const failed = (suite.assertionResults ?? []).filter((test) => test.status === "failed").map((test) => test.fullName);
        return failed.length ? failed : suite.status === "failed" ? [path.relative(root, suite.name)] : [];
      }),
    };
  }
  const report: TestStatusReport = {
    startedAt, finishedAt: new Date().toISOString(), commit: git("rev-parse", "--short", "HEAD"),
    dirty: git("status", "--porcelain") !== "", checks, tests,
  };
  const formatted = formatTestStatus(report);
  const saved = { ...report, ...formatted, reportDirectory: directory };
  for (const destination of [path.join(directory, "report.json"), path.join(output, "latest.json")]) writeFileSync(destination, JSON.stringify(saved, null, 2));
  writeFileSync(path.join(directory, "report.html"), formatted.html);
  writeFileSync(path.join(directory, "report.txt"), formatted.text);
  console.log(formatted.text);
  console.log(`Reports saved to ${directory}`);
  if (process.argv.includes("--send-email")) {
    const gmail = process.argv.includes("--email-provider=gmail") || (!process.argv.includes("--email-provider=smtp") && existsSync(path.join(root, "data", "test-notifications", "gmail-token.dpapi")));
    const sent = gmail
      ? spawnSync(process.execPath, [tool("tsx", "dist/cli.mjs"), path.join(root, "scripts", "send-gmail-report.ts"), "--report", path.join(directory, "report.json")], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 90_000 })
      : spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-File", path.join(root, "scripts", "send-test-status.ps1"), "-ReportPath", path.join(directory, "report.json")], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 60_000 });
    if (sent.status !== 0 || sent.error) {
      console.error("Email delivery failed. The complete report is saved locally; no delivery is claimed.");
      process.exitCode = 2;
    } else console.log(`${gmail ? "Gmail API" : "SMTP server"} accepted the test-status email.`);
  }
  if (!checks.every((check) => check.passed)) process.exitCode ||= 1;
} finally {
  unlinkSync(lock);
}
