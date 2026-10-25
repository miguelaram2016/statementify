const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const parserSource = fs.readFileSync("src/lib/pdfParser.ts", "utf8");
const apiSource = fs.readFileSync("src/app/api/parse/route.ts", "utf8");
const ocrSource = fs.readFileSync("src/lib/ocr.ts", "utf8");

function loadParser() {
  const compiled = ts.transpileModule(parserSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    console: { log() { throw new Error("Transaction details were logged"); } },
    Date,
    Set,
  }, { filename: "pdfParser.js" });
  return exports.parseTransactionsFromText;
}

test("synthetic statement is parsed without logging transactions", () => {
  const parse = loadParser();
  const result = parse(
    "CHECKING ACCOUNT\\nStatement period 01/01/2026 - 01/31/2026\\n" +
    "01/05 COFFEE SHOP 12.50\\n01/06 PAYROLL DEPOSIT 800.00"
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].date, "2026-01-05");
  assert.equal(result[0].amount, -12.5);
  assert.equal(result[1].date, "2026-01-06");
  assert.equal(result[1].amount, 800);
});

test("sensitive parser/OCR/API diagnostics are absent", () => {
  for (const [name, source] of [
    ["parser", parserSource], ["OCR", ocrSource], ["API", apiSource]
  ]) {
    assert.doesNotMatch(source, /console\\.(?:log|info|warn|error|debug)\\s*\\(/, name);
  }
  assert.doesNotMatch(apiSource, /rawText\\.substring|error\\.stack|error: message/);
  assert.match(apiSource, /error: "Could not process this PDF"/);
});

test("API validates PDF header and enforces upload size limit", () => {
  assert.match(apiSource, /MAX_PDF_BYTES = 15 \\* 1024 \\* 1024/);
  assert.match(apiSource, /%PDF-/);
  assert.match(apiSource, /file instanceof File/);
});
