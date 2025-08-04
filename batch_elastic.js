const mappings = {
  properties: {
    id: { type: "integer" },
    book: {
      type: "object",
      properties: {
        title: {
          type: "keyword",
          index: true,
        },
        page_no: { type: "integer" },
        vol_no: { type: "integer" },
      },
    },
    title: {
      type: "text",
      index: true,
      analyzer: "persian",
    },
    topic: {
      type: "text",
      index: true,
      analyzer: "persian",
    },
    text_arabic: {
      type: "text",
      index: true,
      analyzer: "arabic", // Use an Arabic-specific analyzer
    },
    text_arabic_irab: {
      type: "text",
      index: true,
      analyzer: "arabic", // Use an Arabic-specific analyzer
    },
    text_farsi: {
      type: "text",
      index: true,
      analyzer: "persian", // Use a Persian-specific analyzer
    },
    sayers_list: {
      type: "keyword",
      index: true,
    },
    keywords: {
      type: "keyword",
      index: true,
    },
    categories: {
      type: "keyword",
      index: true,
    },
  },
};