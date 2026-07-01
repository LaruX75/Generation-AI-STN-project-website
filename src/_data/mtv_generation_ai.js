const { parseTopicPageItems, resolveTopicUrl } = require("./mtvnews");

module.exports = async function mtvGenerationAiDataSource() {
  try {
    const topicUrl = await resolveTopicUrl({
      topicSlug: "tekoaly",
      query: "tekoäly"
    });

    if (!topicUrl) return [];
    return await parseTopicPageItems(topicUrl, { limit: 20 });
  } catch (e) {
    console.warn(`[mtv_generation_ai] MTV-uutishaku epäonnistui: ${e.message}`);
    return [];
  }
};
