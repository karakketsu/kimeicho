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

  // ジャンル(fandom)ごとにグループ化したコレクション。1作品が複数のfandomタグに属せる（byPairingと同じロジック）
  eleventyConfig.addCollection("byFandom", (collectionApi) => {
    const novels = collectionApi.getFilteredByGlob("src/novels/*.md");
    const groups = {};
    novels.forEach((item) => {
      const fandoms = item.data.fandom || ["未分類"];
      fandoms.forEach((f) => {
        if (!groups[f]) groups[f] = [];
        groups[f].push(item);
      });
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.date - a.date);
    });
    return groups;
  });

  // ジャンル一覧ページ表示用：「お気に入り」を先頭固定、それ以外は作品数の多い順（同数は五十音順）
  eleventyConfig.addCollection("fandomList", (collectionApi) => {
    const novels = collectionApi.getFilteredByGlob("src/novels/*.md");
    const groups = {};
    novels.forEach((item) => {
      const fandoms = item.data.fandom || ["未分類"];
      fandoms.forEach((f) => {
        if (!groups[f]) groups[f] = [];
        groups[f].push(item);
      });
    });
    const FAVORITE = "お気に入り";
    const entries = Object.keys(groups).map((fandom) => ({ fandom, items: groups[fandom] }));
    entries.sort((a, b) => {
      if (a.fandom === FAVORITE) return -1;
      if (b.fandom === FAVORITE) return 1;
      return b.items.length - a.items.length || a.fandom.localeCompare(b.fandom, "ja");
    });
    return entries;
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

  // ブログ記事を年月(YYYY-MM)単位でグループ化したコレクション。新しい月が先
  eleventyConfig.addCollection("postsByMonth", (collectionApi) => {
    const posts = collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => b.date - a.date);
    const groups = {};
    const order = [];
    posts.forEach((item) => {
      const d = item.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) {
        groups[key] = {
          monthKey: key,
          monthLabel: `${d.getFullYear()} ${String(d.getMonth() + 1).padStart(2, "0")}月`,
          posts: [],
        };
        order.push(key);
      }
      groups[key].posts.push(item);
    });
    return order.map((key) => groups[key]);
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

  // 本文（HTML）からタグを除いた文字数を数えるフィルタ（句読点・改行込みの単純な文字数）
  eleventyConfig.addFilter("charCount", (content) => {
    if (!content) return 0;
    return String(content).replace(/<[^>]*>/g, "").length;
  });

  // 数値を3桁カンマ区切りにするフィルタ
  eleventyConfig.addFilter("numberFormat", (num) => {
    return Number(num).toLocaleString("en-US");
  });

  // 日付を日(2桁)だけ取り出すフィルタ
  eleventyConfig.addFilter("dd", (date) => {
    const d = new Date(date);
    return String(d.getDate()).padStart(2, "0");
  });

  // 配列の先頭からN件だけ取り出すフィルタ（Nunjucks標準のsliceはJS配列のslice(start,end)とは
  // 挙動が異なる「N分割」フィルタのため、代わりにこちらを使う）
  eleventyConfig.addFilter("limit", (arr, n) => {
    if (!arr) return [];
    return arr.slice(0, n);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
