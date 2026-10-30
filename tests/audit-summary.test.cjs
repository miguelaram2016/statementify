const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeAudit } = require("../scripts/audit-summary.cjs");

test("critical production advisories fail the audit gate", () => {
  const result = summarizeAudit({
    metadata: { vulnerabilities: { critical: 1, high: 1, moderate: 0, low: 0 } },
    vulnerabilities: {
      unsafe: { severity: "critical", isDirect: true, fixAvailable: false },
    },
  });
  assert.equal(result.passesSecurityGate, false);
  assert.equal(result.findings[0].name, "unsafe");
});

test("high advisories fail the runtime dependency gate", () => {
  const result = summarizeAudit({
    metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 1, low: 0 } },
    vulnerabilities: {
      indirect: { severity: "high", isDirect: false, fixAvailable: true },
      medium: { severity: "moderate", isDirect: true, fixAvailable: true },
    },
  });
  assert.equal(result.passesSecurityGate, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].name, "indirect");
});

test("moderate-only advisories are reported without blocking", () => {
  const result = summarizeAudit({
    metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 1, low: 0 } },
    vulnerabilities: {},
  });
  assert.equal(result.passesSecurityGate, true);
});

test("invalid audit reports are not treated as safe", () => {
  assert.throws(() => summarizeAudit({ error: { message: "registry failed" } }));
});
