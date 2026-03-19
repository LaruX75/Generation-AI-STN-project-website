function buildDataFetchEnv({ mode = "offline", forceRefresh = false } = {}) {
  const live = mode === "live";
  const env = {
    DATA_FETCH_ENABLED: live ? "1" : "0",
    GITHUB_ENABLE_NETWORK: live ? "1" : "0",
    SCHOLARLY_PUBLICATIONS_ENABLE_NETWORK: live ? "1" : "0",
  };

  if (forceRefresh) {
    Object.assign(env, {
      YLE_NEWS_FORCE_REFRESH: "1",
      MTV_NEWS_FORCE_REFRESH: "1",
      HS_NEWS_FORCE_REFRESH: "1",
      UEF_FORCE_REFRESH: "1",
      HELSINKI_NEWS_FORCE_REFRESH: "1",
      HEUREKA_FORCE_REFRESH: "1",
      OULU_FORCE_REFRESH: "1",
      RESEARCHFI_FORCE_REFRESH: "1",
      CODESCHOOL_FORCE_REFRESH: "1",
      GITHUB_FORCE_REFRESH: "1",
      SCHOLARLY_PUBLICATIONS_FORCE_REFRESH: "1",
    });
  }

  return env;
}

module.exports = {
  buildDataFetchEnv,
};
