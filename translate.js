const { GoogleGenAI } = require("@google/genai");
const fs = require("fs/promises");
const dotenv = require("dotenv");

dotenv.config();

const ai = new GoogleGenAI({});
const titleCache = {};

async function translateText(text, isTitle = false) {
  if (isTitle && titleCache[text]) {
    return titleCache[text];
  }

  const prefix = "Translate the following Arabic text to Farsi:";
  const title_sufix = "The word 'باب' stands for 'موضوع'.";
  const prompt = `${prefix} ${isTitle ? title_sufix : ""}
---
${text}
`;

  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: prompt,
      });
      const translated = response.text;
      if (isTitle) {
        titleCache[text] = translated;
      }
      return translated;
    } catch (error) {
      if (error.status === 429) {
        retries++;
        const delay = Math.pow(2, retries) * 1000;
        console.log(`Rate limit hit. Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("Error translating text:", error);
        return text; // Return original text for other errors
      }
    }
  }

  console.error("Max retries reached. Failed to translate text:", text);
  return text; // Return original text if all retries fail
}

async function main() {
  try {
    const data = await fs.readFile("hadiths.json", "utf8");
    const hadiths = JSON.parse(data);
    let translatedHadiths = [];

    // Load existing translations to resume progress
    try {
      const translatedData = await fs.readFile("hadiths_translated.json", "utf8");
      translatedHadiths = JSON.parse(translatedData);
      console.log(`Loaded ${translatedHadiths.length} existing translations.`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("No existing translated file found. Starting fresh.");
      } else {
        throw error;
      }
    }

    const translatedIds = new Set(translatedHadiths.map((h) => h.id));

    for (const hadith of hadiths) {
      if (translatedIds.has(hadith.id)) {
        continue;
      }

      if (!hadith.content.trim()) {
        continue;
      }

      console.log(`Translating hadith ID: ${hadith.id}`);

      const translatedTitle = await translateText(hadith.title, true);
      const translatedContent = await translateText(hadith.content);

      const newHadith = {
        ...hadith,
        title_fa: translatedTitle.trim(),
        content_fa: translatedContent.trim(),
      };

      translatedHadiths.push(newHadith);

      // Save after each translation
      await fs.writeFile(
        "hadiths_translated.json",
        JSON.stringify(translatedHadiths, null, 2)
      );
      console.log(`Finished and saved hadith ID: ${hadith.id}`);
    }

    console.log(
      "Translation complete. All hadiths processed."
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();