const { parseTopicPageItems, resolveTopicUrl } = require("./mtvnews");

module.exports = async function mtvGenerationAiDataSource() {
  const topicUrl = await resolveTopicUrl({
    topicSlug: "tekoaly",
    query: "tekoäly"
  });

  if (!topicUrl) return [];
  return parseTopicPageItems(topicUrl, { limit: 20 });
};
