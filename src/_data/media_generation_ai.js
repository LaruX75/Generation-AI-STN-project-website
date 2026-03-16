const mtvGenerationAi = require("./mtv_generation_ai");
const yleNewsGenerationAi = require("./ylenews_generation_ai");
const hsGenerationAi = require("./hs_generation_ai");

function normalizeItems(items = [], source) {
  return items.map(item => ({
    ...item,
    source,
    sourceLabel:
      source === "mtv"
        ? "MTV Uutiset"
        : source === "yle"
          ? "Yle"
          : source === "hs"
            ? "Helsingin Sanomat"
            : source
  }));
}

module.exports = async function mediaGenerationAiDataSource() {
  const [mtvItems, yleItems, hsItems] = await Promise.all([
    mtvGenerationAi(),
    yleNewsGenerationAi(),
    hsGenerationAi()
  ]);

  return [
    ...normalizeItems(mtvItems, "mtv"),
    ...normalizeItems(yleItems, "yle"),
    ...normalizeItems(hsItems, "hs")
  ].sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || "") || 0;
    const rightTime = Date.parse(right.datePublished || "") || 0;
    return rightTime - leftTime;
  });
};
