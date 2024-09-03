import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

async function captureSnapshot() {
   console.log('Starting the snapshot capture process...');

  const browser = await puppeteer.launch({ headless: true });
  console.log('Browser launched successfully.');

  const page = await browser.newPage();

  const url = `https://www.revolico.com/search?category=compra-venta&subcategory=celulares-lineas-accesorios`;
  console.log(`Navigating to URL: ${url}`);

   try {
     await page.goto(url, { waitUntil: 'networkidle2' });
     console.log('Page loaded successfully.');
   } catch (error) {
     console.error('Error loading the page:', error);
     await browser.close();
     throw error;
   }


  const content = await page.content();

  const snapshotPath = path.join(
    __dirname,
    'tmp',
    'revolico_compra-venta-celulares_snapshot.html',
  );

  // Asegúrate de que la carpeta tmp exista
  mkdirSync(path.dirname(snapshotPath), { recursive: true });

  writeFileSync(snapshotPath, content);

  await browser.close();
  console.log(`Snapshot saved at ${snapshotPath}`);
}

captureSnapshot().catch(error => {
  console.error('Error capturing the snapshot:', error);
  process.exit(1);
});
