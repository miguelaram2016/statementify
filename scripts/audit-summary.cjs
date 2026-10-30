const fs = require("node:fs");

function summarizeAudit(report) {
  if (!report || !report.metadata || !report.metadata.vulnerabilities) {
    throw new Error("npm audit did not return a valid vulnerability report");
  }

  const counts = report.metadata.vulnerabilities;
  const findings = Object.entries(report.vulnerabilities || {})
    .filter(([, item]) => ["moderate", "high", "critical"].includes(item.severity))
    .map(([name, item]) => ({
      name,
      severity: item.severity,
      direct: Boolean(item.isDirect),
      fixable: Boolean(item.fixAvailable),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    counts,
    findings,
    passesSecurityGate: (counts.critical || 0) === 0 && (counts.high || 0) === 0,
  };
}

if (require.main === module) {
  try {
    const result = summarizeAudit(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
    console.log("Production dependency audit:", JSON.stringify(result.counts));
    for (const item of result.findings) {
      console.log(`  ${item.severity}: ${item.name} (${item.direct ? "direct" : "transitive"}, ${item.fixable ? "fix available" : "no direct fix"})`);
    }
    if (!result.passesSecurityGate) {
      console.error("High or critical production dependency advisories detected.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Could not verify dependency security:", error.message);
    process.exitCode = 1;
  }
}

module.exports = { summarizeAudit };
