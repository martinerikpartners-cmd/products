// Excel Formula Finder — MCP server (experiment)
// Free tier only: the 16 free formulas from the live v9 product
// (https://excel-formula-finder-v9.deed.page/), in Korean / English / Vietnamese.
// Data extracted verbatim from ~/workspace/goals/one-person-business-dashboard/files/excel-formula-finder/excel-formula-finder.html
// Pro (34 formulas + 3 template packs) is NOT included: its $19 lifetime payment
// does not exist yet (Stripe 403, 22 Nov 2026), so only Pro names/categories are
// listed as a locked preview, exactly as on the public site.
// No auth in this experiment: all served content is already public and free.
// Run:  node server.mjs            -> Streamable HTTP on PORT (default 3000), GET /mcp
//       node server.mjs --stdio    -> stdio (Claude Desktop / Claude Code local config)

import express from "express";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORMULAS = JSON.parse(readFileSync(join(__dirname, "formulas.json"), "utf8"));
const PRO_TEASERS = JSON.parse(readFileSync(join(__dirname, "pro-teasers.json"), "utf8"));

const LANGS = ["ko", "en", "vi"];
const LANG_NAMES = { ko: "Korean", en: "English", vi: "Vietnamese" };
const CATEGORIES = {
  sum: "Sums & totals",
  lookup: "Lookup",
  date: "Dates",
  logic: "Logic",
  etc: "Text & more",
};
const SOURCE_URL = "https://excel-formula-finder-v9.deed.page/";
const CONTACT = "martinerik.partners@gmail.com";

// --- Search scoring: ported from the v9 site's scoreItem() so the MCP
// recommendations match the website (e.g. SUMIFS first for "monthly total"). ---
function fold(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
const MONTHLY_PHRASES = [
  "월별 합계", "monthly total", "sum by month", "total by month", "tong theo thang",
  "按月汇总", "按月合計", "मासिक कुल", "masik kul", "total mensual", "total mensuel",
  "الإجمالي الشهري", "মাসিক মোট", "total mensal", "сумма за месяц", "ماہانہ کل",
];
function scoreItem(item, q, lang) {
  if (!q) return 0;
  const query = fold(q).trim();
  let score = 0;
  const loc = item.langs[lang] || item.langs.en;
  const name = fold(item.name), title = fold(loc.title), desc = fold(loc.desc);
  if (name === query) score += 120;
  if (name.includes(query)) score += 80;
  if (title.includes(query)) score += 60;
  for (const k of item.keywords) {
    const kw = fold(k);
    if (kw === query) score += 100;
    else if (query.includes(kw)) score += 70;
    else if (kw.includes(query)) score += 45;
  }
  for (const tok of query.split(/\s+/)) {
    if (tok.length < 2) continue;
    for (const k of item.keywords) if (fold(k).includes(tok)) score += 28;
    if (title.includes(tok)) score += 18;
    if (desc.includes(tok)) score += 8;
    if (name.includes(tok)) score += 30;
  }
  if (item.id === "sumifs") {
    for (const p of MONTHLY_PHRASES) {
      if (query.includes(fold(p))) { score += 200; break; }
    }
  }
  if (/(합계|더하|매출 합|총액|sum|total|tong)/.test(query) && item.cat === "sum") score += 6;
  if (/(날짜|기간|근속|월말|말일|date|day|tenure|ngay|thang|tham nien)/.test(query) && item.cat === "date") score += 6;
  if (/(찾|조회|lookup|look up|find|tra cuu|tim)/.test(query) && item.cat === "lookup") score += 6;
  return score;
}

function langOf(input) {
  const l = String(input || "en").toLowerCase().slice(0, 2);
  return LANGS.includes(l) ? l : "en";
}
function summary(f, lang, score) {
  const loc = f.langs[lang] || f.langs.en;
  return {
    id: f.id, name: f.name, category: f.cat,
    category_label: CATEGORIES[f.cat] || f.cat,
    title: loc.title, description: loc.desc,
    ...(score !== undefined ? { score } : {}),
  };
}
function detail(f, lang) {
  const loc = f.langs[lang] || f.langs.en;
  return {
    id: f.id, name: f.name, category: f.cat,
    category_label: CATEGORIES[f.cat] || f.cat,
    language: lang, language_name: LANG_NAMES[lang],
    title: loc.title, description: loc.desc,
    formula: loc.formula, explanation: loc.explain,
    breakdown: (loc.breakdown || []).map(([part, meaning]) => ({ part, meaning })),
    example: {
      headers: loc.example.headers,
      rows: loc.example.rows,
      highlighted_rows: loc.example.hl || [],
      result_label: loc.example.resultLabel,
      result: loc.example.result,
      note: loc.example.note || "",
    },
    source: SOURCE_URL,
  };
}
const text = (obj) => ({
  content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});

function createServer() {
  const server = new McpServer({
    name: "excel-formula-finder",
    version: "0.1.0",
    description:
      "Excel Formula Finder (free tier): recommend Excel formulas for accounting & finance tasks in plain language. 16 free formulas, Korean / English / Vietnamese. Source: https://excel-formula-finder-v9.deed.page/",
  });

  server.registerTool(
    "search_formula",
    {
      title: "Search for an Excel formula",
      description:
        "Recommend Excel formulas for a plain-language task, e.g. 'monthly total', '월별 합계', 'find a client name', 'remove duplicates'. Returns the best-matching free formulas first (same ranking as the Excel Formula Finder website — SUMIFS is first for monthly totals). Use get_formula for the full formula, explanation and example.",
      inputSchema: {
        query: z.string().describe("The task in plain language, in Korean, English or Vietnamese, e.g. 'monthly total' or '월별 합계'."),
        lang: z.enum(["ko", "en", "vi"]).optional().describe("Language for titles/descriptions. Default 'en'."),
        limit: z.number().int().min(1).max(10).optional().describe("Max results. Default 3."),
      },
    },
    ({ query, lang, limit }) => {
      const l = langOf(lang);
      const n = limit ?? 3;
      const ranked = FORMULAS.map((f) => ({ f, s: scoreItem(f, query, l) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, n);
      return text({
        query, language: l,
        matches: ranked.map((x) => summary(x.f, l, x.s)),
        note: ranked.length === 0
          ? "No free formula matched. Try rewording, e.g. 'monthly total', 'sum by condition', 'date difference', 'remove duplicates', 'find a client'."
          : "Free tier only — 16 formulas. Call get_formula with an id for the full formula, explanation and example.",
      });
    }
  );

  server.registerTool(
    "get_formula",
    {
      title: "Get a formula's full detail",
      description:
        "Full detail for one free formula by id (see list_formulas for ids): title, description, copyable formula, plain-language explanation, breakdown of each part, and a worked accounting example table with its result.",
      inputSchema: {
        id: z.string().describe("Formula id, e.g. 'sumifs', 'vlookup', 'xlookup', 'eomonth', 'datedif'."),
        lang: z.enum(["ko", "en", "vi"]).optional().describe("Language. Default 'en'."),
      },
    },
    ({ id, lang }) => {
      const l = langOf(lang);
      const f = FORMULAS.find((x) => x.id === String(id).toLowerCase());
      if (!f) {
        return text({
          error: `No free formula with id '${id}'.`,
          free_ids: FORMULAS.map((x) => x.id),
          note: "Pro formulas (34) are locked — see list_pro_preview for names only. Payment is not connected yet.",
        });
      }
      return text(detail(f, l));
    }
  );

  server.registerTool(
    "list_formulas",
    {
      title: "List free formulas by category",
      description:
        "List the 16 free formulas, optionally filtered by category: sum (sums & totals), lookup, date, logic, etc (text & more). Returns id, name, category and title for each.",
      inputSchema: {
        category: z.enum(["sum", "lookup", "date", "logic", "etc"]).optional().describe("Category filter. Omit for all 16."),
        lang: z.enum(["ko", "en", "vi"]).optional().describe("Language for titles. Default 'en'."),
      },
    },
    ({ category, lang }) => {
      const l = langOf(lang);
      const list = FORMULAS.filter((f) => !category || f.cat === category);
      return text({
        language: l, category: category || "all",
        count: list.length, total_free: FORMULAS.length,
        formulas: list.map((f) => summary(f, l)),
      });
    }
  );

  server.registerTool(
    "list_pro_preview",
    {
      title: "Preview Pro formulas (locked)",
      description:
        "Names and categories of the 34 Pro formulas only — the full formula, explanation and example are locked behind Pro ($19 lifetime). Pro payment is NOT connected yet, so nothing can be bought through this server.",
      inputSchema: {},
    },
    () => text({
      locked: true,
      pro_price: "$19 lifetime (one-time)",
      payment_status: "Not connected — no one can be charged yet.",
      contact: CONTACT,
      count: PRO_TEASERS.length,
      formulas: PRO_TEASERS.map((p) => ({ name: p.name, category: p.cat })),
      templates: [
        "Monthly Close Pack", "Invoicing Pack", "Payroll Checks Pack",
      ],
      note: "Names/categories only, exactly as previewed on the public site. Full Pro content is not served by this MCP server.",
    })
  );

  return server;
}

// --- stdio mode (Claude Desktop / Claude Code local config) ---
if (process.argv.includes("--stdio")) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error("excel-formula-finder MCP server running on stdio (16 free formulas, ko/en/vi)");
} else {
  // --- Streamable HTTP mode ---
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ ok: true, server: "excel-formula-finder", version: "0.1.0", free_formulas: FORMULAS.length, languages: LANGS }));
  app.get("/", (_req, res) => res.json({
    name: "excel-formula-finder",
    version: "0.1.0",
    description: "Excel Formula Finder MCP server (free tier) — 16 free formulas, Korean / English / Vietnamese.",
    source: SOURCE_URL,
    contact: CONTACT,
    mcp_endpoint: "/mcp",
    tools: ["search_formula", "get_formula", "list_formulas", "list_pro_preview"],
    free_formulas: FORMULAS.length,
    languages: LANGS,
    payment_status: "Pro payment not connected — free tier only, nothing can be charged.",
  }));

  const transports = {};
  app.all("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      let transport = sessionId ? transports[sessionId] : undefined;
      if (req.method === "POST") {
        if (transport) {
          await transport.handleRequest(req, res, req.body);
          return;
        }
        if (!isInitializeRequest(req.body)) {
          res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session ID provided" }, id: null });
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => { transports[sid] = transport; },
        });
        transport.onclose = () => {
          if (transport.sessionId) delete transports[transport.sessionId];
        };
        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }
      // GET (SSE stream) / DELETE (terminate session)
      if (!transport) {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session ID provided" }, id: null });
        return;
      }
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP request error:", err);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(err?.message || err) }, id: null });
    }
  });

  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1"; // localhost-only by default (QA note); set HOST=0.0.0.0 only behind HTTPS/auth on a public host
  app.listen(port, host, () => {
    console.error(`excel-formula-finder MCP server listening on http://${host}:${port}/mcp (16 free formulas, ko/en/vi)`);
  });
}
