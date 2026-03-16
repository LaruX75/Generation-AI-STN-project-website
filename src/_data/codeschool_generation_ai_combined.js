const codeschoolAll = require("./codeschool_all");

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function isGenerationAiRelevant(item = {}) {
  const haystack = [
    item.title,
    item.description,
    item.excerpt,
    item.contentText,
    item.keywords,
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(item.categories) ? item.categories : [])
  ]
    .map(normalizeText)
    .join("\n");

  return (
    haystack.includes("generation ai") ||
    haystack.includes("ai literacy") ||
    haystack.includes("artificial intelligence")
  );
}

module.exports = async function codeschoolGenerationAiCombinedDataSource() {
  const items = await codeschoolAll();
  return items.filter(isGenerationAiRelevant);
};
