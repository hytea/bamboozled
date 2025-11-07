const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const puzzleUrls = Array.from(
    { length: 60 },
    (_, i) =>
      `https://www.thinkablepuzzles.com/bamboozables/bamboozable${i + 1}.jpg`
  );
  const answerUrls = Array.from(
    { length: 60 },
    (_, i) =>
      `https://www.thinkablepuzzles.com/bamboozables/bamboozable${
        i + 1
      }answers.shtml`
  );

  const puzzleData = [];

  for (let i = 0; i < puzzleUrls.length; i++) {
    await page.goto(puzzleUrls[i]);
    await page.setViewport({
      width: 800,
      height: 1000,
    });

    const image = await page.$('img');
    const bounding_box = await image.boundingBox();

    // convert the one image into 6 images two rows of three squares
    // The first square is from 2,2 to 188,188
    // The second square is from 197,2 to 381,188
    // The third square is from 391,2 to 577,188
    // The fourth square is from 2,198 to 188,384
    // The fifth square is from 197,198 to 381,384
    // The sixth square is from 391,198 to 577,384
    const imageBuffer1 = await page.screenshot({
      clip: {
        x: bounding_box.x + 2,
        y: bounding_box.y + 2,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });
    const imageBuffer2 = await page.screenshot({
      clip: {
        x: bounding_box.x + 197,
        y: bounding_box.y + 2,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });
    const imageBuffer3 = await page.screenshot({
      clip: {
        x: bounding_box.x + 391,
        y: bounding_box.y + 2,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });
    const imageBuffer4 = await page.screenshot({
      clip: {
        x: bounding_box.x + 2,
        y: bounding_box.y + 198,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });
    const imageBuffer5 = await page.screenshot({
      clip: {
        x: bounding_box.x + 197,
        y: bounding_box.y + 198,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });
    const imageBuffer6 = await page.screenshot({
      clip: {
        x: bounding_box.x + 391,
        y: bounding_box.y + 198,
        width: 186,
        height: 186,
      },
      encoding: 'binary',
    });

    await page.goto(answerUrls[i]);
    const answerText = await page.evaluate(() => {
      return document
        .querySelector(
          'body > div:nth-child(2) > table > tbody > tr > td:nth-child(2) > table:nth-child(1) > tbody > tr > td > table > tbody > tr > td:nth-child(1) > p:nth-child(2) > font'
        )
        .textContent.trim();
    });
    // parse into six answers
    const answers = answerText.split('\n').map((answer) => answer.trim());

    // save each of the six puzzles and corresponding answer to a file

    fs.writeFileSync(`puzzle${i + 1}-1.png`, imageBuffer1, 'binary');
    fs.writeFileSync(`puzzle${i + 1}-2.png`, imageBuffer2, 'binary');
    fs.writeFileSync(`puzzle${i + 1}-3.png`, imageBuffer3, 'binary');
    fs.writeFileSync(`puzzle${i + 1}-4.png`, imageBuffer4, 'binary');
    fs.writeFileSync(`puzzle${i + 1}-5.png`, imageBuffer5, 'binary');
    fs.writeFileSync(`puzzle${i + 1}-6.png`, imageBuffer6, 'binary');

    puzzleData.push({
      pageNumber: i + 1,
      pageUrl: puzzleUrls[i],
      answerUrl: answerUrls[i],
      puzzleImageName: [
        `puzzle${i + 1}-1.png`,
        `puzzle${i + 1}-2.png`,
        `puzzle${i + 1}-3.png`,
        `puzzle${i + 1}-4.png`,
        `puzzle${i + 1}-5.png`,
        `puzzle${i + 1}-6.png`,
      ],
      answers,
    });
  }

  fs.writeFileSync('puzzle-data.json', JSON.stringify(puzzleData));

  await browser.close();
})();
