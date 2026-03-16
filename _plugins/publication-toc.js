"use strict";

/**
 * Eleventy transform plugin: adds id attributes to h2/h3 headings
 * inside the publication body (#pub-body) and server-side renders the TOC
 * into #pub-toc-nav. Only processes pages that contain both markers.
 */

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[äå]/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
}

/**
 * Extract the content of a div with a specific id.
 * Returns { before, body, after } strings, or null if not found.
 */
function extractDiv(html, id) {
  const openRe = new RegExp(`<div[^>]+\\bid\\s*=\\s*["']${id}["'][^>]*>`, "i");
  const openMatch = openRe.exec(html);
  if (!openMatch) return null;

  const start = openMatch.index;
  const contentStart = start + openMatch[0].length;
  let depth = 1;
  let pos = contentStart;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);

    if (nextClose === -1) break; // malformed

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return {
          before: html.slice(0, start),
          open: openMatch[0],
          body: html.slice(contentStart, nextClose),
          after: html.slice(nextClose),
        };
      }
      pos = nextClose + 6;
    }
  }
  return null;
}

module.exports = function publicationTocPlugin(eleventyConfig) {
  eleventyConfig.addTransform("publication-toc", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    if (!content.includes('id="pub-toc-nav"') || !content.includes('id="pub-body"')) return content;

    // Extract the publication body content only
    const extracted = extractDiv(content, "pub-body");
    if (!extracted) return content;

    const usedIds = {};
    const tocItems = [];

    // Add id attributes to h2/h3 inside pub-body, collect TOC data
    const processedBody = extracted.body.replace(
      /<(h[23])(\s[^>]*)?>(\s*[\s\S]*?)<\/h[23]>/gi,
      (match, tag, attrs = "", inner) => {
        const existingIdMatch = attrs.match(/\bid\s*=\s*["']([^"']+)/i);
        const text = stripTags(inner).trim();

        if (existingIdMatch) {
          if (text && text.length <= 90) {
            tocItems.push({ level: tag.toLowerCase(), id: existingIdMatch[1], text });
          }
          return match;
        }

        if (!text) return match;

        let base = slugify(text);
        if (!base) return match;

        let finalId = base;
        let n = 2;
        while (usedIds[finalId]) { finalId = base + "-" + n++; }
        usedIds[finalId] = true;

        if (text.length <= 90) {
          tocItems.push({ level: tag.toLowerCase(), id: finalId, text });
        }

        return `<${tag}${attrs} id="${finalId}">${inner}</${tag}>`;
      }
    );

    // Reassemble the page with processed body
    let result = extracted.before + extracted.open + processedBody + extracted.after;

    if (!tocItems.length) return result;

    // Build TOC HTML
    const listItems = tocItems
      .map(({ level, id, text }) =>
        `<li class="pub-toc-item pub-toc-item--${level}"><a href="#${id}" class="pub-toc-link">${text}</a></li>`
      )
      .join("\n");
    const tocHtml = `<ul class="pub-toc-list">\n${listItems}\n</ul>`;

    // Inject into placeholder nav
    return result.replace(
      /<nav id="pub-toc-nav" class="publication-toc-nav"><\/nav>/,
      `<nav id="pub-toc-nav" class="publication-toc-nav">${tocHtml}</nav>`
    );
  });
};
