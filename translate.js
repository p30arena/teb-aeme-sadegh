import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

async function translateText(text, isTitle = false) {
  const prefix = "Translate the following Arabic text to Farsi:";
  const title_sufix = "Do not translate the word 'باب' and keep it as it is.";
  const prompt = `${prefix} ${isTitle ? title_sufix : ""}
---
${text}
`;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error translating text:", error);
    // Return original text if translation fails
    return text; 
  }
}

async function main() {
  try {
    const data = await fs.readFile("hadiths.json", "utf8");
    const hadiths = JSON.parse(data);
    const translatedHadiths = [];

    for (const hadith of hadiths) {
      console.log(`Translating hadith ID: ${hadith.id}`);
      
      const translatedTitle = await translateText(hadith.title, true);
      const translatedContent = await translateText(hadith.content);

      const newHadith = {
        ...hadith,
        title_fa: translatedTitle.trim(),
        content_fa: translatedContent.trim(),
      };
      
      translatedHadiths.push(newHadith);
      console.log(`Finished translating hadith ID: ${hadith.id}`);
    }

    await fs.writeFile("hadiths_translated.json", JSON.stringify(translatedHadiths, null, 2));
    console.log("Translation complete. Translated file saved as hadiths_translated.json");

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();