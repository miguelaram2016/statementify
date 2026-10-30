const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("src/lib/pdfParser.ts", "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports, Date, Set }, { filename: "pdfParser.js" });
const { parseTransactionsFromText } = exports;

test("uses amount column rather than running balance in a checking table", () => {
  const text = [
    "CHECKING",
    "Statement period 01/01/2026 - 01/31/2026",
    "Date Description Amount Balance",
    "01/05 COFFEE SHOP 12.50 987.50",
    "01/06 PAYROLL DEPOSIT 800.00 1787.50",
  ].join("\n");

  const result = parseTransactionsFromText(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].amount, -12.50);
  assert.equal(result[0].description, "COFFEE SHOP");
  assert.equal(result[1].amount, 800);
  assert.equal(result[1].description, "PAYROLL DEPOSIT");
});

test("balance summary alone does not change amount selection", () => {
  const text = [
    "CHECKING",
    "Statement period 01/01/2026 - 01/31/2026",
    "Ending Balance 5000.00",
    "01/05 COFFEE SHOP 12.50",
  ].join("\n");

  const result = parseTransactionsFromText(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, -12.50);
});

test("preserves two real same-day transactions even if values match", () => {
  const text = [
    "CHECKING",
    "Statement period 01/01/2026 - 01/31/2026",
    "01/05 COFFEE SHOP 12.50",
    "01/05 COFFEE SHOP 12.50",
  ].join("\n");

  const result = parseTransactionsFromText(text);
  assert.equal(result.length, 2);
  assert.deepEqual(Array.from(result, (tx) => tx.amount), [-12.50, -12.50]);
});

test("infers the correct year across a December to January statement period", () => {
  const text = [
    "CHECKING",
    "Statement period 12/20/2025 - 01/19/2026",
    "12/31 OFFICE SUPPLIES 18.00",
    "01/02 PAYROLL DEPOSIT 800.00",
  ].join("\n");

  const result = parseTransactionsFromText(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].date, "2025-12-31");
  assert.equal(result[1].date, "2026-01-02");
});

test("preserves wrapped descriptions and their transaction amount", () => {
  const text = [
    "CHECKING",
    "Statement period 01/01/2026 - 01/31/2026",
    "01/09 LOCAL COFFEE",
    "SHOP DOWNTOWN",
    "12.50",
  ].join("\n");

  const result = parseTransactionsFromText(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, -12.50);
  assert.equal(result[0].description, "LOCAL COFFEE SHOP DOWNTOWN");
});
