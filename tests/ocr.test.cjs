const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScript(path, dependencies = {}, globals = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: {} },
    ...globals,
  }, { filename: path });
  return exported;
}

function setup({ embedded, recognized = [], failOnPage = 0 }) {
  const stats = {
    activeCanvases: 0,
    maxCanvases: 0,
    cleared: 0,
    cleanedPages: 0,
    workersCreated: 0,
    workersTerminated: 0,
    destroyed: 0,
    scannedPages: [],
  };

  const pdf = {
    numPages: embedded.length,
    async getPage(pageNumber) {
      return {
        async getTextContent() {
          return { items: [{ str: embedded[pageNumber - 1], hasEOL: true }] };
        },
        getViewport() {
          return { width: 1200, height: 1600 };
        },
        render({ canvasContext }) {
          canvasContext.canvas.pageNumber = pageNumber;
          return { promise: Promise.resolve() };
        },
        cleanup() {
          stats.cleanedPages++;
          return true;
        },
      };
    },
    async destroy() {
      stats.destroyed++;
    },
  };

  const document = {
    createElement(name) {
      assert.equal(name, "canvas");
      let width = 0;
      const canvas = {
        pageNumber: 0,
        height: 0,
        get width() { return width; },
        set width(next) {
          if (width === 0 && next > 0) {
            stats.activeCanvases++;
            stats.maxCanvases = Math.max(stats.maxCanvases, stats.activeCanvases);
          }
          if (width > 0 && next === 0) {
            stats.activeCanvases--;
            stats.cleared++;
          }
          width = next;
        },
        getContext() { return { canvas }; },
      };
      return canvas;
    },
  };

  const tesseract = {
    default: {
      async createWorker(language, oem, options) {
        assert.equal(language, "eng");
        assert.equal(oem, 1);
        assert.equal(typeof options.logger, "function");
        stats.workersCreated++;
        return {
          async recognize(canvas) {
            stats.scannedPages.push(canvas.pageNumber);
            options.logger({ status: "recognizing text" });
            if (canvas.pageNumber === failOnPage) throw new Error("Synthetic OCR failure");
            return { data: { text: recognized[canvas.pageNumber - 1] || "" } };
          },
          async terminate() { stats.workersTerminated++; },
        };
      },
    },
  };

  const parse = loadTypeScript("src/lib/pdfParser.ts").parseTransactionsFromText;
  const pipeline = loadTypeScript(
    "src/lib/ocr.ts",
    { "tesseract.js": tesseract, "./pdfParser": { parseTransactionsFromText: parse } },
    {
      window: {
        pdfjsLib: {
          getDocument() { return { promise: Promise.resolve(pdf) }; },
          GlobalWorkerOptions: { workerSrc: "" },
        },
      },
      document,
    }
  );

  return {
    stats,
    process: () => pipeline.processStatementFile({
      arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer,
    }),
  };
}

const header = "CHECKING ACCOUNT\nStatement period 01/01/2026 - 01/31/2026\n";
const descriptions = "Customer service information is available on your statement.\n".repeat(4);

test("digital statements skip OCR and destroy the document", async () => {
  const scenario = setup({
    embedded: [header + descriptions + "01/05 COFFEE SHOP 12.50"],
  });
  const result = await scenario.process();
  assert.equal(result.method, "text");
  assert.equal(result.pageCount, 1);
  assert.equal(result.ocrPages, 0);
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].amount, -12.5);
  assert.equal(scenario.stats.workersCreated, 0);
  assert.equal(scenario.stats.destroyed, 1);
});

test("scanned pages share one worker and never retain multiple canvases", async () => {
  const scenario = setup({
    embedded: ["", ""],
    recognized: [
      header + "01/05 COFFEE SHOP 12.50",
      "01/06 PAYROLL DEPOSIT 800.00",
    ],
  });
  const result = await scenario.process();
  assert.equal(result.method, "ocr");
  assert.equal(result.ocrPages, 2);
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[1].amount, 800);
  assert.deepEqual(scenario.stats.scannedPages, [1, 2]);
  assert.equal(scenario.stats.maxCanvases, 1);
  assert.equal(scenario.stats.activeCanvases, 0);
  assert.equal(scenario.stats.cleared, 2);
  assert.equal(scenario.stats.cleanedPages, 2);
  assert.equal(scenario.stats.workersCreated, 1);
  assert.equal(scenario.stats.workersTerminated, 1);
  assert.equal(scenario.stats.destroyed, 1);
});

test("mixed statements OCR only sparse pages while retaining digital rows", async () => {
  const scenario = setup({
    embedded: [header + descriptions + "01/05 COFFEE SHOP 12.50", ""],
    recognized: ["", "01/06 PAYROLL DEPOSIT 800.00"],
  });
  const result = await scenario.process();
  assert.equal(result.method, "ocr");
  assert.equal(result.pageCount, 2);
  assert.equal(result.ocrPages, 1);
  assert.equal(result.transactions.length, 2);
  assert.match(result.rawText, /COFFEE SHOP/);
  assert.match(result.rawText, /PAYROLL DEPOSIT/);
  assert.deepEqual(scenario.stats.scannedPages, [2]);
  assert.equal(scenario.stats.destroyed, 1);
});

test("OCR failure still clears canvas and terminates workers", async () => {
  const scenario = setup({
    embedded: ["", ""],
    recognized: ["01/05 COFFEE SHOP 12.50", ""],
    failOnPage: 2,
  });
  await assert.rejects(scenario.process(), /Synthetic OCR failure/);
  assert.equal(scenario.stats.workersCreated, 1);
  assert.equal(scenario.stats.workersTerminated, 1);
  assert.equal(scenario.stats.maxCanvases, 1);
  assert.equal(scenario.stats.activeCanvases, 0);
  assert.equal(scenario.stats.cleanedPages, 2);
  assert.equal(scenario.stats.destroyed, 1);
});
