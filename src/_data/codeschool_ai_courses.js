const { discoverCoursePages } = require("./codeschoolcourses");

module.exports = async function codeschoolAiCoursesDataSource() {
  return discoverCoursePages({
    matchTerms: ["AI", "AI Literacy", "artificial intelligence"]
  });
};
