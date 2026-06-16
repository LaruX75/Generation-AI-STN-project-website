#!/usr/bin/env node
"use strict";

const fs   = require("fs");
const path = require("path");

const YLE_API     = "https://yle-fi-search.api.yle.fi/v1/search";
const YLE_APP_ID  = "hakuylefi_v2_prod";
const YLE_APP_KEY = "4c1422b466ee676e03c4ba9866c0921f";

async function main() {
  const cfgPath = path.join(__dirname, "../src/_data/ylenews.config.json");
  const config  = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const people  = config.people || [];

  const seen    = new Set();
  const results = [];

  for (const person of people) {
    const params = new URLSearchParams({
      app_id: YLE_APP_ID, app_key: YLE_APP_KEY,
      query: person.name, type: person.type || "article",
      language: person.language || "fi", uiLanguage: person.uiLanguage || "fi",
      limit: person.limit || 5, offset: 0
    });
    try {
      const res = await fetch(`${YLE_API}?${params}`);
      if (!res.ok) { console.warn(`  ⚠ ${person.name}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      let added = 0;
      for (const item of (data.data || [])) {
        const url = item?.url?.full || item?.url?.short || "";
        if (!url || seen.has(url)) continue;
        const haystack = `${item.headline||""} ${item.lead||""} ${(item.author||[]).map(a=>a.name||a||"").join(" ")}`.toLowerCase();
        const terms = (person.matchTerms || [person.name]).map(t => t.toLowerCase());
        if (!terms.some(t => haystack.includes(t))) continue;
        seen.add(url); added++;
        results.push({
          personName:    person.name,
          datePublished: item.datePublished || "",
          title:         item.headline || "",
          url,
          lead:          item.lead || ""
        });
      }
      console.log(`  ✓ ${person.name}: ${added} osumaa`);
    } catch (e) {
      console.warn(`  ✗ ${person.name}: ${e.message}`);
    }
  }

  // Generic AI search
  try {
    const aiParams = new URLSearchParams({
      app_id: YLE_APP_ID, app_key: YLE_APP_KEY,
      query: "tekoäly", type: "article", language: "fi", uiLanguage: "fi", limit: 20, offset: 0
    });
    const res = await fetch(`${YLE_API}?${aiParams}`);
    if (res.ok) {
      const data = await res.json();
      let added = 0;
      for (const item of (data.data || [])) {
        const url = item?.url?.full || item?.url?.short || "";
        if (!url || seen.has(url)) continue;
        seen.add(url); added++;
        results.push({
          personName: "tekoäly", datePublished: item.datePublished || "",
          title: item.headline || "", url, lead: item.lead || ""
        });
      }
      console.log(`  ✓ tekoäly: ${added} osumaa`);
    }
  } catch (e) {
    console.warn(`  ✗ tekoäly: ${e.message}`);
  }

  results.sort((a, b) => (b.datePublished || "").localeCompare(a.datePublished || ""));

  const out = { fetchedAt: new Date().toISOString(), count: results.length, articles: results };
  const outPath = path.join(__dirname, "../admin/yle-results.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nValmis: ${results.length} artikkelia → admin/yle-results.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
