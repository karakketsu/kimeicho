module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // 小説だけを集めたコレクション（Vaultは含まない）
  eleventyConfig.addCollection("novels", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/novels/*.md").sort((a, b) => {
      return b.date - a.date; // 新しい順
    });
  });

  // Vault（限定公開）作品のコレクション。通常のnovels/genres/pairingsには一切含めない
  eleventyConfig.addCollection("vaultNovels", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/vault/novels/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // ブログ記事のコレクション
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => {
      return b.date - a.date;
    });
  });

  // ジャンル(fandom)ごとにグループ化したコレクション
  eleventyConfig.addCollection("byFandom", (collectionApi) => {
    const novels = collectionApi.getFilteredByGlob("src/novels/*.md");
    const groups = {};
    novels.forEach((item) => {
      const fandom = item.data.fandom || "未分類";
      if (!groups[fandom]) groups[fandom] = [];
      groups[fandom].push(item);
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.date - a.date);
    });
    return groups;
  });

  // カップリングごとにグループ化したコレクション
  eleventyConfig.addCollection("byPairing", (collectionApi) => {
    const novels = collectionApi.getFilteredByGlob("src/novels/*.md");
    const groups = {};
    novels.forEach((item) => {
      const pairings = item.data.pairing || ["未設定"];
      pairings.forEach((p) => {
        if (!groups[p]) groups[p] = [];
        groups[p].push(item);
      });
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.date - a.date);
    });
    return groups;
  });

  // 日本語を残せる独自のslugifyフィルタ（デフォルトのslugifyは日本語を消してしまうため上書き）
  eleventyConfig.addFilter("slugify", (str) => {
    return String(str)
      .trim()
      .replace(/[\s]+/g, "-")
      .replace(/[\/\\?%*:|"<>#&]/g, "");
  });

  // 日付を YYYY.MM 形式に整形するフィルタ
  eleventyConfig.addFilter("ym", (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}.${m}`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
