# Publish checklist — Excel Formula Finder MCP server

Status: **package prepared, nothing published yet.** Work through these steps in order. Steps marked 🔑 need Robin's own accounts — Minmin cannot do those.

## 0. Before you start — fill in the placeholders

- [x] **GitHub username**: filled in on 23 Nov 2026 — `martinerikpartners-cmd`, in all three places:
  - `server.json` → `name` (`io.github.martinerikpartners-cmd/excel-formula-finder`) and `repository.url`
  - `package.json` → `mcpName` and `repository.url`
  - `README.md` → release link
  - `mcpName` in `package.json` is identical to `name` in `server.json`. (If the GitHub username is different from the npm username, that is fine — the registry name comes from the GitHub login, the npm package name stays `excel-formula-finder-mcp`.)
- [ ] **npm package name**: `excel-formula-finder-mcp` was free on npm when checked (23 Nov 2026). Re-check with `npm view excel-formula-finder-mcp` before publishing — if it is taken by then, pick a new name and update `package.json` (`name`), `server.json` (`packages[0].identifier`), and `README.md`.

## 1. Create the public GitHub repo 🔑

- [ ] On GitHub, create a **public** repo named `products` under Robin's account (the saved github.com login).
- [ ] Push the contents of `excel-mcp-publish/` (except the `mcpb/` folder and this checklist) to the repo's main branch: `server.mjs`, `formulas.json`, `pro-teasers.json`, `test-client.mjs`, `package.json`, `server.json`, `README.md`, `LICENSE`, `bin/`.
- [ ] Check the repo page renders the README correctly.

## 2. Publish the npm package 🔑

- [ ] `npm login` with Robin's npm account (create one at npmjs.com if there is none — free).
- [ ] From the repo folder: `npm publish --access public`
- [ ] Confirm: `npm view excel-formula-finder-mcp version` shows `0.1.0`.

## 3. Publish to the official MCP Registry 🔑

- [ ] Install the publisher CLI: `brew install mcp-publisher` (macOS) or download the binary from the registry's GitHub releases.
- [ ] `mcp-publisher validate server.json` — must pass.
- [ ] `mcp-publisher login github` — sign in with the same GitHub account as step 1 (this proves ownership of the `io.github.<user>` namespace).
- [ ] `mcp-publisher publish`
- [ ] Confirm: `GET https://registry.modelcontextprotocol.io/v0.1/servers?search=excel-formula-finder` returns the listing with status `active`.
- [ ] Note: the registry stores metadata only — the code stays on npm/GitHub.

## 4. Attach the Claude Desktop Extension (.mcpb) to a GitHub release 🔑

- [ ] The bundle `mcpb/excel-formula-finder.mcpb` is already built and validated in this package (see `mcpb/`). Do **not** sign it — Claude Desktop installs unsigned bundles.
- [ ] On GitHub, create a release (e.g. `v0.1.0`) and attach `excel-formula-finder.mcpb` as a release asset.
- [ ] Test: on a Mac with Claude Desktop, double-click the downloaded `.mcpb` and confirm `excel-formula-finder` appears under Settings → Extensions as a local MCP server.
- [ ] The README already links to the releases page for the bundle.

## 5. After it is live

- [ ] In Claude Desktop plugin search, check the server is discoverable (directories can take days to index — this is normal).
- [ ] Try the install from scratch on a clean machine: `npx -y excel-formula-finder-mcp --stdio` in Claude Desktop config, then ask "월별 합계" and confirm SUMIFS comes first with the 2,180,000 example.
- [ ] Tell Minmin the registry listing URL and the release URL so they can be recorded.

## NOT part of this publish

- **Pro payments**: the $19 Pro payment link does not exist yet (Stripe 403, 22 Nov 2026). Publishing the free server does not sell Pro. Wiring Pro unlock (payment link + licence check in the server) is a separate job.
- **Hosted public endpoint**: this package is a local (stdio) server. A public hosted MCP endpoint for ChatGPT remote use is a separate decision and cost (~US$2–7/month).
- **Other catalogs** (mcp.so, Glama, Smithery): optional later — most read the official registry, so start there.
