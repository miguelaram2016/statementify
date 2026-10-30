const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function compile(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exported = {};
  vm.runInNewContext(code, {
    exports: exported,
    require(name) {
      if (!(name in dependencies)) throw new Error("Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return exported;
}

function fixture() {
  return [
    { date: "2026-01-05", description: "=SUM(A1:A3)", amount: -12.5, balance: 987.5 },
    { date: "2026-01-06", description: "REFUND", amount: 31.75 },
  ];
}

test("Excel rows preserve original columns, signed amounts and formula-like text", () => {
  const exporter = compile("src/lib/exporters/excel.ts", {
    "write-excel-file/browser": { __esModule: true, default: () => ({ toFile: async () => {} }) },
  });
  const rows = JSON.parse(JSON.stringify(exporter.buildExcelRows(fixture())));
  assert.deepEqual(rows, [
    ["Date", "Description", "Amount", "Balance"],
    ["2026-01-05", "=SUM(A1:A3)", -12.5, 987.5],
    ["2026-01-06", "REFUND", 31.75, null],
  ]);
});

test("Excel exporter generates the Transactions sheet and waits for save", async () => {
  const calls = [];
  const exporter = compile("src/lib/exporters/excel.ts", {
    "write-excel-file/browser": {
      __esModule: true,
      default: (rows, options) => ({
        toFile: async (name) => { calls.push({ rows, options, name }); },
      }),
    },
  });
  await exporter.downloadExcel(fixture(), "statement");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "statement.xlsx");
  assert.equal(calls[0].options.sheet, "Transactions");
  assert.equal(calls[0].options.columns[1].width, 50);
  assert.equal(calls[0].options.stickyRowsCount, 1);
});

test("Excel export rejects when writer fails instead of silently reporting success", async () => {
  const exporter = compile("src/lib/exporters/excel.ts", {
    "write-excel-file/browser": {
      __esModule: true,
      default: () => ({ toFile: async () => { throw new Error("Synthetic save failure"); } }),
    },
  });
  await assert.rejects(exporter.downloadExcel(fixture()), /Synthetic save failure/);
});

test("OFX debits remain negative and credits positive", () => {
  const exporter = compile("src/lib/exporters/ofx.ts");
  const result = exporter.generateOFX(fixture());
  assert.match(result, /<TRNTYPE>DEBIT<\/TRNTYPE>/);
  assert.match(result, /<TRNAMT>-12\.50<\/TRNAMT>/);
  assert.match(result, /<TRNAMT>31\.75<\/TRNAMT>/);
});

test("legacy xlsx module no longer appears in the export path", () => {
  const source = fs.readFileSync("src/lib/exporters/excel.ts", "utf8");
  assert.doesNotMatch(source, /from ["']xlsx["']/);
  assert.match(source, /write-excel-file\/browser/);
});
