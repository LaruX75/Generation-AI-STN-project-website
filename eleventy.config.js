const path = require("node:path");
const eleventyImage = require("@11ty/eleventy-img");
const Image = eleventyImage.default || eleventyImage;
const pluginNavigation = require("@11ty/eleventy-navigation");
const pluginPublicationToc = require("./_plugins/publication-toc.js");
const { runPagefind } = require("./scripts/run-pagefind");
const registerFilters = require("./eleventy.filters.js");
const registerCollections = require("./eleventy.collections.js");

module.exports = function(eleventyConfig) {
  const outputDirName = process.env.ELEVENTY_OUTPUT_DIR || "_site";

  const yaml = require("js-yaml");
  eleventyConfig.addDataExtension("yaml", contents => yaml.load(contents));

  eleventyConfig.setWatchThrottleWaitTime(200);
  // Allow .well-known directory (dot-prefixed dirs are ignored by default)
  eleventyConfig.watchIgnores.delete("**/.well-known/**");

  const { existsSync } = require("node:fs");
  if (existsSync("admin")) eleventyConfig.addPassthroughCopy({ "admin": "admin" });
  if (existsSync("media")) eleventyConfig.addPassthroughCopy({ "media": "media" });
  if (existsSync("styles")) eleventyConfig.addPassthroughCopy({ "styles": "styles" });
  if (existsSync("assets")) eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  if (existsSync("scripts")) eleventyConfig.addPassthroughCopy({ "scripts": "scripts" });
  eleventyConfig.addPassthroughCopy({ "node_modules/vanilla-cookieconsent/dist/cookieconsent.css": "styles/cookieconsent.css" });
  eleventyConfig.addPassthroughCopy({ "node_modules/vanilla-cookieconsent/dist/cookieconsent.umd.js": "scripts/cookieconsent.umd.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/gridjs/dist/gridjs.umd.js": "scripts/gridjs.umd.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/gridjs/dist/theme/mermaid.min.css": "styles/gridjs-mermaid.css" });

  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginPublicationToc);

  async function renderHeroImage(src) {
    if (!src) return "";
    const originalSrc = String(src);
    const isRemote = /^https?:\/\//i.test(originalSrc);
    const input = isRemote
      ? originalSrc
      : path.join(process.cwd(), originalSrc.replace(/^\//, ""));
    const metadata = await Image(input, {
      widths: [768, 1280, 1920],
      formats: ["webp", "jpeg"],
      outputDir: path.join(process.cwd(), outputDirName, "img", "hero"),
      urlPath: "/img/hero/",
      sharpOptions: {
        jpeg: { quality: 82, mozjpeg: true },
        webp: { quality: 78 },
      },
      filenameFormat: function(id, src, width, format) {
        const name = path.basename(src, path.extname(src)).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `${name}-${width}w.${format}`;
      },
    });
    if (!metadata || typeof metadata !== "object" || !Object.keys(metadata).length) {
      return `<img class="hero-bg-image" src="${originalSrc}" alt="" decoding="async" fetchpriority="high">`;
    }
    return eleventyImage.generateHTML(metadata, {
      alt: "",
      src: originalSrc,
      sizes: "100vw",
      loading: "eager",
      decoding: "async",
      fetchpriority: "high",
      class: "hero-bg-image",
    });
  }

  eleventyConfig.addNunjucksAsyncShortcode("heroImage", renderHeroImage);

  registerFilters(eleventyConfig);
  registerCollections(eleventyConfig);

  eleventyConfig.on("eleventy.after", async ({ directories, outputMode }) => {
    if (outputMode !== "fs") return;
    await runPagefind({ site: directories.output });
  });

  // Mark paragraphs starting with – (en-dash) as speech quotes so CSS can style them.
  eleventyConfig.addTransform("speechQuote", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content.replace(/<p>(–|—)/g, '<p class="speech-quote">$1');
  });

  // Prefix all root-relative paths in output HTML for GitHub Pages project site.
  const REPO_PREFIX = "";
  eleventyConfig.addTransform("repoPathPrefix", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content
      .replace(/(href=")\/(?!\/)/g,    `$1${REPO_PREFIX}/`)
      .replace(/(src=")\/(?!\/)/g,     `$1${REPO_PREFIX}/`)
      .replace(/(action=")\/(?!\/)/g,  `$1${REPO_PREFIX}/`)
      .replace(/(content=")\/(?!\/)/g, `$1${REPO_PREFIX}/`)
      .replace(/(url=)\/(?!\/)/g,      `$1${REPO_PREFIX}/`);
  });

  return {
    dir: { input: "content", includes: "../_includes", data: "../src/_data", output: outputDirName },
    templateFormats: ["md", "njk", "html", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
