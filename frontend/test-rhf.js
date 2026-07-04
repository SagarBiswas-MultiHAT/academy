
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/login');
  
  // Try typing
  await page.type('input[type=email]', 'test@example.com');
  
  const val = await page.('input[type=email]', el => el.value);
  console.log('Value typed:', val);
  
  await browser.close();
})();

