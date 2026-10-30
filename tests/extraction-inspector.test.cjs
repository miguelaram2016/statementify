const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const componentSource = fs.readFileSync("src/components/ExtractionInspector.tsx", "utf8");
const pageSource = fs.readFileSync("src/app/HomeClient.tsx", "utf8");

function loadInspector() {
  const compiled = ts.transpileModule(componentSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleExports = {};
  vm.runInNewContext(compiled, {
    exports: moduleExports,
    require: (name) => require(name),
  }, { filename: "ExtractionInspector.js" });
  return moduleExports.default;
}

const first = {
  fileName: "synthetic-one.pdf",
  rawText: "CHECKING\n01/05 SYNTHETIC MERCHANT 12.50",
  method: "text",
  pageCount: 1,
  ocrPages: 0,
  textLength: 38,
  transactions: [{ date: "2026-01-05", description: "SYNTHETIC MERCHANT", amount: -12.5 }],
};

test("opt-in inspector presents extracted text and matching transaction rows", () => {
  const Inspector = loadInspector();
  const html = renderToStaticMarkup(React.createElement(Inspector, {
    records: [first],
    onClear: () => {},
  }));
  assert.match(html, /Local extraction inspector/);
  assert.match(html, /01\/05 SYNTHETIC MERCHANT 12\.50/);
  assert.match(html, /2026-01-05/);
  assert.match(html, /SYNTHETIC MERCHANT/);
  assert.match(html, /-12\.50/);
  assert.match(html, /Clear inspector data/);
  assert.match(html, /0\/1 pages OCR-scanned/);
});

test("multiple files are individually selectable, no records reveal no content", () => {
  const Inspector = loadInspector();
  const next = { ...first, fileName: "synthetic-two.pdf", rawText: "01/06 OTHER STORE 9.00" };
  const html = renderToStaticMarkup(React.createElement(Inspector, {
    records: [first, next],
    onClear: () => {},
  }));
  assert.match(html, /synthetic-one\.pdf/);
  assert.match(html, /synthetic-two\.pdf/);

  const empty = renderToStaticMarkup(React.createElement(Inspector, {
    records: [],
    onClear: () => {},
  }));
  assert.equal(empty, "");
});

test("capture is opt-in and old runs cannot restore cleared inspection results", () => {
  assert.match(pageSource, /useState\(false\)/);
  assert.match(pageSource, /if \(inspectorEnabledRef\.current\) \{/);
  assert.match(pageSource, /setInspectionRecords\(inspectorEnabledRef\.current \? inspected : \[\]\)/);
  assert.match(pageSource, /processingRunRef\.current\+\+/);
  assert.match(pageSource, /if \(runId !== processingRunRef\.current\) return;/);
  assert.match(pageSource, /if \(!enabled\) setInspectionRecords\(\[\]\)/);
  assert.match(pageSource, /changeInspectorEnabled\(false\)/);
});

test("inspector does not persist or transmit extracted financial text", () => {
  assert.doesNotMatch(componentSource, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b\s*[.(]/);
  assert.doesNotMatch(componentSource, /console\.(log|debug|error|info)\s*\(/);
});
