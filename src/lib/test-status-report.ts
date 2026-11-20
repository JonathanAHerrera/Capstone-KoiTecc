export type QualityCheck = { name: string; passed: boolean; durationSeconds: number; logFile: string };
export type TestStatusReport = {
  startedAt: string; finishedAt: string; commit: string; dirty: boolean; checks: QualityCheck[];
  tests: null | { passed: number; failed: number; skipped: number; suitesPassed: number; suitesFailed: number; failures: string[] };
};
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function formatTestStatus(report: TestStatusReport): { subject: string; text: string; html: string } {
  const passed = report.checks.length > 0 && report.checks.every((check) => check.passed) && report.tests !== null && report.tests.failed === 0 && report.tests.suitesFailed === 0;
  const when = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(report.finishedAt));
  const summary = passed ? "All quality checks passed." : "Some quality checks need attention.";
  const counts = report.tests ? `${report.tests.passed} tests passed, ${report.tests.failed} failed, ${report.tests.skipped} skipped. ${report.tests.suitesFailed} suites failed.` : "Test counts could not be read; consult the saved test log.";
  const version = `Commit ${report.commit}${report.dirty ? " with local changes" : " (clean checkout)"}`;
  const failures = report.tests?.failures.slice(0, 12) ?? [];
  const limitation = "AI calls used deterministic mocks. This run does not verify live AI quality, Google/Microsoft OAuth, or production email delivery.";
  const subject = `KOITECC test status: ${passed ? "PASS" : "ATTENTION"} — ${when} Central`;
  const text = ["Hello,", "", `${summary} This update contains fresh results from the current local checkout.`, when + " Central", version, "", counts, "", ...report.checks.map((check) => `${check.passed ? "PASS" : "FAIL"} — ${check.name} (${check.durationSeconds}s)`), ...(failures.length ? ["", "Tests requiring attention:", ...failures.map((name) => `- ${name}`)] : []), "", limitation, "", "Detailed logs and an HTML copy are saved in data/test-status/.", "", "KOITECC automated quality report"].join("\n");
  const rows = report.checks.map((check) => `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escape(check.name)}</td><td style="padding:10px;color:${check.passed ? "#166534" : "#991b1b"}">${check.passed ? "PASS" : "FAIL"}</td><td style="padding:10px">${check.durationSeconds}s</td></tr>`).join("");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f7f8;color:#15293a;padding:24px"><main style="max-width:680px;margin:auto;background:white;border-radius:16px;padding:28px"><p style="color:#0b7d73">KOITECC · QUALITY UPDATE</p><h1 style="font-size:24px">${summary}</h1><p>Hello, here are the latest test results.</p><p>${escape(when)} Central<br>${escape(version)}</p><p><strong>${escape(counts)}</strong></p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Check</th><th align="left">Result</th><th align="left">Time</th></tr></thead><tbody>${rows}</tbody></table>${failures.length ? `<h2 style="font-size:18px">Tests requiring attention</h2><ul>${failures.map((name) => `<li>${escape(name)}</li>`).join("")}</ul>` : ""}<p style="font-size:13px;color:#46606f">${limitation}</p><p style="font-size:13px">Full logs: data/test-status/ on the test machine.</p></main></body></html>`;
  return { subject, text, html };
}
