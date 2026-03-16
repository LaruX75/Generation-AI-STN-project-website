const codeschoolGenerationAi = require("./codeschool_generation_ai");
const codeschoolAiCourses = require("./codeschool_ai_courses");

function normalizeItems(items = [], source, contentType) {
  return items.map(item => ({
    ...item,
    source,
    contentType,
    sourceLabel:
      source === "codeschool-blog"
        ? "Code School Finland"
        : source === "codeschool-courses"
          ? "Code School Courses"
          : source,
    contentTypeLabel:
      contentType === "article"
        ? "Article"
        : contentType === "course"
          ? "Course"
          : contentType
  }));
}

module.exports = async function codeschoolAllDataSource() {
  const [generationAiItems, aiCourseItems] = await Promise.all([
    codeschoolGenerationAi(),
    codeschoolAiCourses()
  ]);

  return [
    ...normalizeItems(generationAiItems, "codeschool-blog", "article"),
    ...normalizeItems(aiCourseItems, "codeschool-courses", "course")
  ].sort((left, right) => {
    const leftTime = Date.parse(left.datePublished || left.dateModified || "") || 0;
    const rightTime = Date.parse(right.datePublished || right.dateModified || "") || 0;

    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.title || "").localeCompare(String(right.title || ""), "fi");
  });
};
