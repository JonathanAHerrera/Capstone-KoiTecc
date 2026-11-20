import { expect, test } from "vitest";
import { formatTestStatus, type TestStatusReport } from "./test-status-report";

const sample = (overrides: Partial<TestStatusReport> = {}): TestStatusReport => ({
  startedAt: "2026-11-12T15:55:00Z", finishedAt: "2026-11-12T16:00:00Z", commit: "abc1234", dirty: true,
  checks: [{ name: "Regression tests", passed: true, durationSeconds: 12, logFile: "1.log" }],
  tests: { passed: 140, failed: 0, skipped: 1, suitesPassed: 22, suitesFailed: 0, failures: [] },
  ...overrides,
});

test("a successful report shows actual counts, Central time, local changes, and verification limits", () => {
  const report = formatTestStatus(sample());
  expect(report.subject).toContain("PASS");
  expect(report.subject).toContain("10:00 AM");
  expect(report.text).toContain("140 tests passed, 0 failed, 1 skipped");
  expect(report.text).toContain("abc1234 with local changes");
  expect(report.text).toContain("deterministic mocks");
  expect(report.html).toContain("Regression tests");
});
test("a failed check never produces a passing notification", () => {
  const report = formatTestStatus(sample({ checks: [{ name: "Production build", passed: false, durationSeconds: 8, logFile: "4.log" }] }));
  expect(report.subject).toContain("ATTENTION");
  expect(report.text).toContain("FAIL — Production build");
});
test("failed suite counts take precedence over a contradictory successful exit code", () => {
  const report = formatTestStatus(sample({ tests: { passed: 0, failed: 0, skipped: 0, suitesPassed: 0, suitesFailed: 1, failures: ["Suite failed to initialize"] } }));
  expect(report.subject).toContain("ATTENTION");
});
test("missing test results and empty runs are described honestly", () => {
  const report = formatTestStatus(sample({ checks: [], tests: null }));
  expect(report.subject).toContain("ATTENTION");
  expect(report.text).toContain("Test counts could not be read");
});
test("test names and commit text cannot inject HTML into emailed reports", () => {
  const report = formatTestStatus(sample({ commit: '<img src=x onerror="alert(1)">', tests: { passed: 0, failed: 1, skipped: 0, suitesPassed: 0, suitesFailed: 1, failures: ["<script>secret()</script>"] } }));
  expect(report.html).not.toContain("<script>");
  expect(report.html).not.toContain("<img");
  expect(report.html).toContain("&lt;script&gt;");
});
