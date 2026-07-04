#!/usr/bin/env node
"use strict";

process.env.SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK = "true";
process.env.OPENALEX_ALLOW_UNAUTHENTICATED = "true";
if (!process.env.OPENALEX_MAILTO) {
  process.env.OPENALEX_MAILTO = "jari.laru@gmail.com";
}

const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const dataFn = require("../src/_data/scholarlyPublications.js");
  console.log("[fetch-publications] Haetaan julkaisuja verkosta...");
  const publications = await dataFn();
  if (!publications.length) {
    console.warn("[fetch-publications] Ei julkaisuja — snapshotia ei päivitetty.");
    process.exit(1);
  }
  const dest = path.join(__dirname, "../data/publications-snapshot.json");
  fs.writeFileSync(dest, JSON.stringify(publications, null, 2), "utf8");
  console.log(`[fetch-publications] Tallennettu ${publications.length} julkaisua → ${dest}`);
}

main().catch(err => {
  console.error("[fetch-publications] Virhe:", err.message);
  process.exit(1);
});
