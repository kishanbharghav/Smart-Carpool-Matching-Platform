import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
       console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`[pageerror] ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`[requestfailed] ${request.url()} - ${request.failure().errorText}`);
  });

  console.log('Navigating to http://localhost:3000/login ...');
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    console.log('Successfully loaded page. Now waiting 3 seconds for React to throw if any...');
    await new Promise(r => setTimeout(r, 2000));
    const html = await page.evaluate(() => document.getElementById('root').innerHTML);
    fs.writeFileSync('dom-output.html', html);
    console.log('Saved dom-output.html');
  } catch(e) {
    console.log('Goto failed: ' + e.message);
  }

  await browser.close();
})();
