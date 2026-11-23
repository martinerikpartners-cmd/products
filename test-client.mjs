// Live test client for the Excel Formula Finder MCP server (Streamable HTTP).
// Usage: start the server first (node server.mjs, PORT 3000), then: node test-client.mjs
// Exits 0 only if every check passes.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = process.env.MCP_URL || "http://localhost:3000/mcp";
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, result: ok ? "PASS" : "FAIL", detail });
  if (ok) { pass++; console.log(`PASS  ${name} ${detail}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
}
function parse(res) {
  const t = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(t); } catch { return { _raw: t }; }
}
function num(s) { return Number(String(s).replace(/[^0-9]/g, "")); }

const client = new Client({ name: "excel-mcp-test", version: "0.1.0" }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL(BASE)));
console.log("connected to", BASE);

const tools = await client.listTools();
check("tools/list returns 4 tools", tools.tools.length === 4, tools.tools.map(t => t.name).join(","));
const names = tools.tools.map(t => t.name);
for (const n of ["search_formula", "get_formula", "list_formulas", "list_pro_preview"])
  check(`tool present: ${n}`, names.includes(n));

// 1. monthly total (en) -> SUMIFS first
let r = parse(await client.callTool({ name: "search_formula", arguments: { query: "monthly total", lang: "en" } }));
check("search 'monthly total' first = sumifs", r.matches?.[0]?.id === "sumifs", `first=${r.matches?.[0]?.id} score=${r.matches?.[0]?.score}`);

// 2. 월별 합계 (ko) -> SUMIFS first
r = parse(await client.callTool({ name: "search_formula", arguments: { query: "월별 합계", lang: "ko" } }));
check("search '월별 합계' first = sumifs", r.matches?.[0]?.id === "sumifs", `first=${r.matches?.[0]?.id}`);

// 3. get sumifs en — exact formula + example sums to 2,180,000
r = parse(await client.callTool({ name: "get_formula", arguments: { id: "sumifs", lang: "en" } }));
check("get sumifs en formula matches v9", r.formula === '=SUMIFS(C2:C6, A2:A6, ">="&DATE(2026,1,1), A2:A6, "<"&DATE(2026,2,1), B2:B6, "Card sales")', r.formula);
check("get sumifs en result 2,180,000", r.example?.result === "2,180,000", `result=${r.example?.result}`);
const rows = r.example?.rows || [];
const janCard = rows.filter(row => row[0].startsWith("2026-01") && row[1] === "Card sales").reduce((a, row) => a + num(row[2]), 0);
check("sumifs example rows recompute to 2,180,000", janCard === 2180000, `computed=${janCard}`);

// 4. ko + vi formulas match v9
r = parse(await client.callTool({ name: "get_formula", arguments: { id: "sumifs", lang: "ko" } }));
check("get sumifs ko formula matches v9", r.formula?.includes('"카드매출"') && r.example?.result === "2,180,000원", r.example?.result);
r = parse(await client.callTool({ name: "get_formula", arguments: { id: "sumifs", lang: "vi" } }));
check("get sumifs vi result 2.180.000", r.example?.result === "2.180.000", `result=${r.example?.result}`);

// 5. list all = 16, categories correct
r = parse(await client.callTool({ name: "list_formulas", arguments: {} }));
check("list_formulas all = 16", r.count === 16 && r.total_free === 16, `count=${r.count}`);
const ids = r.formulas.map(f => f.id);
for (const id of ["sumifs","sumproduct","xlookup","vlookup","indexmatch","if","ifs","countifs","averageifs","eomonth","datedif","text","round","unique","iferror","sumif"])
  check(`free id present: ${id}`, ids.includes(id));
r = parse(await client.callTool({ name: "list_formulas", arguments: { category: "date" } }));
check("list category=date returns eomonth+datedif", r.count === 2 && r.formulas.map(f=>f.id).sort().join(",") === "datedif,eomonth", r.formulas.map(f=>f.id).join(","));

// 6. lookup query
r = parse(await client.callTool({ name: "search_formula", arguments: { query: "find a client name", lang: "en" } }));
check("search 'find a client name' top is vlookup/xlookup", ["vlookup","xlookup","indexmatch"].includes(r.matches?.[0]?.id), `first=${r.matches?.[0]?.id}`);

// 7. Pro preview: locked, 34, payment not connected, no full formulas
r = parse(await client.callTool({ name: "list_pro_preview", arguments: {} }));
check("pro preview locked + 34 teasers", r.locked === true && r.count === 34, `count=${r.count}`);
check("pro preview says payment not connected", /not connected/i.test(r.payment_status || ""), r.payment_status);
check("pro preview has no full formula text", !JSON.stringify(r).includes("=SUMIFS"), "names/categories only");

// 8. unknown id + no-match query handled honestly
r = parse(await client.callTool({ name: "get_formula", arguments: { id: "nope123" } }));
check("unknown id returns error + free ids", !!r.error && Array.isArray(r.free_ids) && r.free_ids.length === 16, r.error);
r = parse(await client.callTool({ name: "search_formula", arguments: { query: "zzzzqqq nonsense" } }));
check("nonsense query returns 0 matches", (r.matches || []).length === 0, `matches=${(r.matches||[]).length}`);

await client.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
