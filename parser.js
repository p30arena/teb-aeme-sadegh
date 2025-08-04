const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const SCRAPED_DATA_DIR = './scraped_data';
const OUTPUT_FILE = './hadiths.json';

async function getFilePaths(dir) {
  let allFiles = [];
  const dirents = await fs.readdir(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      allFiles = allFiles.concat(await getFilePaths(res));
    } else if (dirent.isFile() && dirent.name.endsWith('.json')) {
      allFiles.push(res);
    }
  }
  return allFiles;
}

async function main() {
  console.log('Starting parser...');
  const filePaths = await getFilePaths(SCRAPED_DATA_DIR);

  const groupedFiles = filePaths.reduce((acc, filePath) => {
    const match = filePath.match(/volume_(\d+)\/section_(\d+)\/page_(\d+)\.json$/);
    if (match) {
      const [, volume, section, page] = match.map(Number);
      if (!acc[volume]) {
        acc[volume] = {};
      }
      if (!acc[volume][section]) {
        acc[volume][section] = [];
      }
      acc[volume][section].push({ path: filePath, page });
    }
    return acc;
  }, {});

  const sortedPaths = [];
  const sortedVolumes = Object.keys(groupedFiles).sort((a, b) => Number(a) - Number(b));

  for (const volume of sortedVolumes) {
    const sortedSections = Object.keys(groupedFiles[volume]).sort((a, b) => Number(a) - Number(b));
    for (const section of sortedSections) {
      const pages = groupedFiles[volume][section];
      // Create a new sorted array instead of sorting in-place to be safe
      const sortedPages = [...pages].sort((a, b) => a.page - b.page);
      for (const page of sortedPages) {
        sortedPaths.push(page.path);
      }
    }
  }

  console.log(`Found ${sortedPaths.length} files to parse.`);

  const allHadiths = [];
  let currentTitle = 'Untitled';

  for (const filePath of sortedPaths) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    const paragList = jsonData.data[0].paragList;

    if (!paragList) continue;

    const match = filePath.match(/volume_(\d+)\/section_(\d+)\/page_(\d+)\.json$/);
    if (!match) continue;
    const [, volume, section, page] = match.map(Number);

    for (const parag of paragList) {
      const $ = cheerio.load(parag.text);
      const heading = $('heading').text().trim();
      if (heading) {
        currentTitle = heading;
      }

      const hadithElement = $('format.hadith');
      if (hadithElement.length > 0) {
        let revayatIndex = hadithElement.attr('revayatindex');
        const hadithContent = hadithElement.text().trim();

        if (!revayatIndex) {
          // If revayatindex is missing or empty, create a unique ID
          const paragraphId = hadithElement.closest('p').attr('id');
          revayatIndex = `gen_${filePath}_${paragraphId}`;
        }

        const existingHadith = allHadiths.find(
          h => h.id === revayatIndex && h.title === currentTitle
        );

        if (existingHadith) {
          existingHadith.content += `\n${hadithContent}`;
        } else {
          allHadiths.push({
            vol: volume,
            sec: section,
            page: page,
            id: revayatIndex,
            title: currentTitle,
            content: hadithContent,
          });
        }
      }
    }
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allHadiths, null, 2));
  console.log(`Successfully parsed and saved ${allHadiths.length} hadiths to ${OUTPUT_FILE}`);
  console.log('Parsing complete.');
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});