export interface Transaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  accountType?: "credit_card" | "checking";
}

export interface ParseResult {
  transactions: Transaction[];
  rawText: string;
  error?: string;
}

type AccountType = "credit_card" | "checking";

interface StatementContext {
  accountType: AccountType;
  startDate?: Date;
  endDate?: Date;
}

interface DateMatch {
  raw: string;
  date: string;
  index: number;
}

export function detectStatementType(text: string): AccountType {
  const t = text.toUpperCase();

  const creditCardSignals = [
    "CARDHOLDER STATEMENT",
    "WORLDPOINTS",
    "REWARD",
    "CREDIT CARD",
    "ACCRUAL",
    "ANNUAL PERCENTAGE",
    "CASH BACK",
    "PURCHASE APR",
    "BALANCE TRANSFER",
    "MINIMUM PAYMENT DUE",
    "NEW BALANCE",
    "PAYMENTS AND OTHER CREDITS",
    "PURCHASES AND OTHER CHARGES",
  ];

  const checkingSignals = [
    "CHECKING",
    "SAVINGS",
    "STATEMENT PERIOD",
    "BEGINNING BALANCE",
    "ENDING BALANCE",
    "DEPOSIT SLIP",
    "WITHDRAWAL",
    "OVERDRAFT",
    "ATM",
    "WIRE TRANSFER",
    "ZELLE",
    "ACH CREDIT",
    "ACH DEBIT",
  ];

  let creditScore = 0;
  let checkingScore = 0;

  for (const sig of creditCardSignals) if (t.includes(sig)) creditScore++;
  for (const sig of checkingSignals) if (t.includes(sig)) checkingScore++;

  return creditScore > checkingScore ? "credit_card" : "checking";
}

function monthNameToIndex(month: string): number {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return months.indexOf(month.slice(0, 3).toLowerCase());
}

function normalizeYear(year: number): number {
  if (year < 100) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function inferYear(month: number, day: number, ctx: StatementContext): number {
  if (ctx.startDate && ctx.endDate) {
    const candidates = [ctx.startDate.getFullYear() - 1, ctx.startDate.getFullYear(), ctx.endDate.getFullYear(), ctx.endDate.getFullYear() + 1];

    let bestYear = ctx.endDate.getFullYear();
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const year of candidates) {
      const candidate = makeDate(year, month, day);
      const startDistance = Math.abs(candidate.getTime() - ctx.startDate.getTime());
      const endDistance = Math.abs(candidate.getTime() - ctx.endDate.getTime());
      const distance = Math.min(startDistance, endDistance);
      const insideRange = candidate >= ctx.startDate && candidate <= ctx.endDate;

      if (insideRange) return year;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestYear = year;
      }
    }

    return bestYear;
  }

  return new Date().getFullYear();
}

function extractStatementPeriod(text: string): Pick<StatementContext, "startDate" | "endDate"> {
  const normalized = text.replace(/\s+/g, " ");

  const monthRange = normalized.match(
    /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\s*[-–]\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i
  );

  if (monthRange) {
    const startMonth = monthNameToIndex(monthRange[1]) + 1;
    const endMonth = monthNameToIndex(monthRange[4]) + 1;
    const startDay = parseInt(monthRange[2], 10);
    const startYear = parseInt(monthRange[3], 10);
    const endDay = parseInt(monthRange[5], 10);
    const endYear = parseInt(monthRange[6], 10);
    return {
      startDate: makeDate(startYear, startMonth, startDay),
      endDate: makeDate(endYear, endMonth, endDay),
    };
  }

  const numericRange = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*[-–]\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numericRange) {
    const startMonth = parseInt(numericRange[1], 10);
    const startDay = parseInt(numericRange[2], 10);
    const startYear = normalizeYear(parseInt(numericRange[3], 10));
    const endMonth = parseInt(numericRange[4], 10);
    const endDay = parseInt(numericRange[5], 10);
    const endYear = normalizeYear(parseInt(numericRange[6], 10));

    return {
      startDate: makeDate(startYear, startMonth, startDay),
      endDate: makeDate(endYear, endMonth, endDay),
    };
  }

  return {};
}

function extractAllDates(line: string, ctx: StatementContext): DateMatch[] {
  const matches: DateMatch[] = [];

  const fullNumeric = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  let numericMatch: RegExpExecArray | null;
  while ((numericMatch = fullNumeric.exec(line)) !== null) {
    const month = parseInt(numericMatch[1], 10);
    const day = parseInt(numericMatch[2], 10);
    const year = normalizeYear(parseInt(numericMatch[3], 10));
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    matches.push({
      raw: numericMatch[0],
      date: toIsoDate(year, month, day),
      index: numericMatch.index,
    });
  }

  const shortNumeric = /\b(\d{1,2})[\/\-](\d{1,2})\b/g;
  let shortMatch: RegExpExecArray | null;
  while ((shortMatch = shortNumeric.exec(line)) !== null) {
    const raw = shortMatch[0];
    const nextChar = line[shortMatch.index + raw.length];
    if (nextChar === "/" || nextChar === "-") continue;

    const month = parseInt(shortMatch[1], 10);
    const day = parseInt(shortMatch[2], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    const year = inferYear(month, day, ctx);
    matches.push({
      raw,
      date: toIsoDate(year, month, day),
      index: shortMatch.index,
    });
  }

  const textMonth = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,\s*|\s+)(\d{4})\b/gi;
  let textMatch: RegExpExecArray | null;
  while ((textMatch = textMonth.exec(line)) !== null) {
    const month = monthNameToIndex(textMatch[1]) + 1;
    const day = parseInt(textMatch[2], 10);
    const year = parseInt(textMatch[3], 10);
    if (month < 1 || day < 1 || day > 31) continue;
    matches.push({
      raw: textMatch[0],
      date: toIsoDate(year, month, day),
      index: textMatch.index,
    });
  }

  matches.sort((a, b) => a.index - b.index);

  return matches.filter((match, index) => {
    const prev = matches[index - 1];
    return !prev || prev.index !== match.index || prev.date !== match.date;
  });
}

function extractAmounts(line: string): number[] {
  const matches = [...line.matchAll(/\(?-?\$?\s*([\d,]+\.\d{2})\)?/g)];
  const amounts = matches
    .map((match) => parseFloat(match[1].replace(/,/g, "")))
    .filter((amount) => !Number.isNaN(amount) && amount > 0 && amount < 100000);

  return amounts;
}

function looksLikeHeader(line: string): boolean {
  return [
    /^statement$/i,
    /^account$/i,
    /^balance$/i,
    /^total$/i,
    /^page\s+\d+/i,
    /^date$/i,
    /^posted$/i,
    /^posting$/i,
    /^description$/i,
    /^reference number$/i,
    /^bank of america/i,
    /^worldpoints/i,
    /^cardholder statement/i,
    /^account information/i,
    /^payment information/i,
    /^account summary/i,
    /^customer service/i,
    /^payment due date/i,
    /^minimum payment/i,
    /^previous balance/i,
    /^new balance/i,
    /^credit limit/i,
    /^available credit/i,
    /^beginning balance/i,
    /^ending balance/i,
    /^www\./i,
    /^mail payments to/i,
    /^transactions?$/i,
  ].some((pattern) => pattern.test(line));
}

function isMostlyGarbage(line: string): boolean {
  if (line.length < 2) return true;
  if (/^[\s=\-_*\.]{3,}$/.test(line)) return true;
  if (/^[\d\s]{12,}$/.test(line)) return true;
  if (line.length > 220) return true;
  return false;
}

function isNoiseLine(line: string): boolean {
  if (isMostlyGarbage(line)) return true;
  if (looksLikeHeader(line)) return true;

  const noisyPhrases = [
    /annual percentage/i,
    /minimum payment warning/i,
    /balance transfer/i,
    /finance charge/i,
    /interest charge/i,
    /promotional balance/i,
    /customer correspondence/i,
    /business offers/i,
    /rewards summary/i,
    /other bonuses/i,
    /other credits/i,
    /automatic payments/i,
    /turn on automatic/i,
    /schedule automatic/i,
    /avoid interest/i,
    /pay more in interest/i,
  ];

  return noisyPhrases.some((pattern) => pattern.test(line));
}

function isZeroAuthLine(line: string): boolean {
  const compact = line.replace(/\s+/g, " ").trim();
  return /^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\s+\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\s+\$?0\.00$/i.test(compact);
}

function cleanDescription(value: string): string {
  return value
    .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, " ")
    .replace(/\$?\s*[\d,]+\.\d{2}\b/g, " ")
    .replace(/\b(?:CR|DR)\b/gi, " ")
    .replace(/\bX{3,}\d*\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-*:.,]+/, "")
    .replace(/[\s\-*:.,]+$/, "")
    .trim()
    .slice(0, 200);
}

function isCreditCardPayment(description: string): boolean {
  const d = description.toUpperCase();
  return /^(PAYMENT|THANK YOU|ELECTRONIC PAYMENT|AUTO PAYMENT|ONLINE PAYMENT|RECURRING PAYMENT|CREDIT|REFUND|REVERSAL|REBATE|CHARGEBACK|DISPUTE CRED)/.test(d)
    || (/PAYMENT/.test(d) && /(THANK YOU|ELECTRONIC|AUTO|ONLINE|RECURRING)/.test(d));
}

function isCheckingCredit(description: string): boolean {
  const d = description.toUpperCase();
  return /(PAYROLL|DIRECT DEP(OSIT)?|ACH CREDIT|DEPOSIT|CASH DEP(OSIT)?|TRANSFER FROM|REFUND|REVERSAL CREDIT|ZELLE FROM|VENMO CASHOUT)/.test(d);
}

function shouldSkipTransaction(description: string, amount: number): boolean {
  if (!description || description.length < 2) return true;
  if (/^\d+$/.test(description)) return true;
  if (amount < 0.5) return true;
  if (/^(posted|transaction|reference|date)$/i.test(description)) return true;
  return false;
}

export function parseTransactionsFromText(text: string, accountType?: AccountType): Transaction[] {
  console.log("[pdfParser] Input text length:", text.length);

  const ctx: StatementContext = {
    accountType: accountType || detectStatementType(text),
    ...extractStatementPeriod(text),
  };

  console.log("[pdfParser] Detected account type:", ctx.accountType);
  console.log("[pdfParser] Statement period:", ctx.startDate?.toISOString(), ctx.endDate?.toISOString());

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  console.log("[pdfParser] Total non-empty lines:", lines.length);

  const transactions: Transaction[] = [];
  const usedLines = new Set<number>();

  for (let index = 0; index < lines.length; index++) {
    if (usedLines.has(index)) continue;

    const line = lines[index];
    if (isNoiseLine(line) || isZeroAuthLine(line)) continue;

    const dateMatches = extractAllDates(line, ctx);
    if (dateMatches.length === 0) continue;

    const groupLines = [line];
    for (let offset = 1; offset <= 2 && index + offset < lines.length; offset++) {
      const nextLine = lines[index + offset];
      if (isNoiseLine(nextLine)) break;
      if (isZeroAuthLine(nextLine)) {
        usedLines.add(index + offset);
        continue;
      }
      const nextLineDates = extractAllDates(nextLine, ctx);
      if (nextLineDates.length > 0) break;
      groupLines.push(nextLine);
    }

    groupLines.forEach((_, offset) => usedLines.add(index + offset));

    const combined = groupLines.join(" ");
    const amounts = extractAmounts(combined);
    if (amounts.length === 0) continue;

    const nonZeroAmounts = amounts.filter((amount) => amount > 0);
    if (nonZeroAmounts.length === 0) continue;

    let amount = nonZeroAmounts[nonZeroAmounts.length - 1];
    const primaryDate = dateMatches[0];

    let description = cleanDescription(combined);
    if (!description || description.length < 3) {
      description = cleanDescription(line.slice(primaryDate.index + primaryDate.raw.length));
    }

    if (shouldSkipTransaction(description, amount)) continue;

    if (ctx.accountType === "credit_card") {
      amount = isCreditCardPayment(description) ? -amount : amount;
    } else {
      amount = isCheckingCredit(description) ? amount : -amount;
    }

    transactions.push({
      date: primaryDate.date,
      description,
      amount,
      accountType: ctx.accountType,
    });
  }

  transactions.sort((a, b) => (a.date > b.date ? 1 : -1));

  const seen = new Set<string>();
  const unique = transactions.filter((tx) => {
    const key = `${tx.date}|${tx.description}|${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[pdfParser] Found ${unique.length} transactions`);
  unique.slice(0, 5).forEach((tx) => {
    console.log(`  ${tx.date} | ${tx.description.slice(0, 40)} | $${tx.amount.toFixed(2)}`);
  });

  return unique;
}
