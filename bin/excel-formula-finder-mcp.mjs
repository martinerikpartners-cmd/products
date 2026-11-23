#!/usr/bin/env node
// npm bin entry for excel-formula-finder-mcp.
// Runs server.mjs, which starts stdio mode when --stdio is passed
// (e.g. `npx -y excel-formula-finder-mcp --stdio`) and otherwise
// starts the Streamable HTTP server on PORT (default 3000).
import "../server.mjs";
