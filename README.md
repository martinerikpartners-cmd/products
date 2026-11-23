# Excel Formula Finder — MCP server

Ask Claude for an Excel formula in plain language, and get the right one back — in Korean, English, or Vietnamese.

This is the MCP server for [Excel Formula Finder](https://excel-formula-finder-v9.deed.page/), a free formula search tool for accounting and finance work. Type what you want to do ("월별 합계", "monthly total", "find a client name") and it recommends the formula, with a copyable formula, a plain explanation, and a worked example.

## What it serves

**Free — 16 formulas**, in Korean (`ko`), English (`en`), and Vietnamese (`vi`):

SUMIFS, SUMPRODUCT, XLOOKUP, VLOOKUP, INDEX+MATCH, IF, IFS, COUNTIFS, AVERAGEIFS, EOMONTH, DATEDIF, TEXT, ROUND, UNIQUE, IFERROR, SUMIF.

**Pro — $19 lifetime, teaser only.** The Pro tier (34 extra formulas + 3 template packs: month-end closing, invoice, payroll check) is shown as names and previews only. **Payment is not connected yet, so Pro cannot be bought through this server** — nothing is charged, and no Pro content is served. Pro is available on the website once payment is connected.

## Tools (4)

| Tool | What it does |
|---|---|
| `search_formula` | Recommend formulas for a plain-language task (`query`, `lang`, `limit`). Same ranking as the website — SUMIFS is first for "monthly total" / "월별 합계". |
| `get_formula` | Full detail for one formula by id: title, description, copyable formula, plain explanation, breakdown, worked example table + result. |
| `list_formulas` | List the 16 free formulas, optionally by category (`sum`, `lookup`, `date`, `logic`, `etc`). |
| `list_pro_preview` | Names + categories of the 34 Pro formulas only (locked). |

Formula data is taken verbatim from the live website — no invented formulas.

## Install

Requires Node.js 20+.

### Claude Desktop

Settings → Developer → Edit Config, add:

```json
{
  "mcpServers": {
    "excel-formula-finder": {
      "command": "npx",
      "args": ["-y", "excel-formula-finder-mcp", "--stdio"]
    }
  }
}
```

Restart Claude Desktop. Or install the `.mcpb` bundle from the [latest release](https://github.com/martinerikpartners-cmd/products/releases) — double-click it and Claude Desktop installs it.

To run from a local checkout instead:

```json
{
  "mcpServers": {
    "excel-formula-finder": {
      "command": "node",
      "args": ["/absolute/path/to/excel-formula-finder-mcp/server.mjs", "--stdio"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add excel-formula-finder -- npx -y excel-formula-finder-mcp --stdio
```

### Run it yourself

```bash
npm install
node server.mjs --stdio   # stdio mode (Claude Desktop / Claude Code)
node server.mjs            # Streamable HTTP on http://127.0.0.1:3000/mcp
```

## Try it

Ask Claude:

- "월별 합계" → SUMIFS first, with a worked example totalling 2,180,000.
- "find a client name" → XLOOKUP / VLOOKUP at the top.
- "월말 날짜 구하기" → EOMONTH.

## Costs

Local / stdio use is free — formula lookup serves static content, no AI model is resold, no per-call bill. A hosted public endpoint costs roughly US$2–7/month on a small instance; see `DEPLOY.md` in the source repo history if you self-host.

## Links

- Website: https://excel-formula-finder-v9.deed.page/
- Contact: martinerik.partners@gmail.com

## License

MIT — see [LICENSE](LICENSE).
