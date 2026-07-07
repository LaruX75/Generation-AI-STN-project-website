const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

module.exports = function () {
  const data = yaml.load(
    fs.readFileSync(path.join(__dirname, "myyttipodcast.yaml"), "utf8")
  );
  const lookup = {};
  for (const kausi of data.kaudet) {
    for (const jakso of kausi.jaksot) {
      if (jakso.myytti != null) {
        lookup[jakso.myytti] = jakso;
      }
    }
  }
  return lookup;
};
