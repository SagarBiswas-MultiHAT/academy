
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });
  
  console.log('Done loading. Checking for form...');
  const form = await page.form;
  console.log('Form exists:', !!form);
  
  await browser.close();
})();

