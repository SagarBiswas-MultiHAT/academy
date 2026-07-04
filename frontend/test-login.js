
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/login');
  
  await page.type('input[type=email]', 'admin@multihat.dev');
  await page.type('input[type=password]', 'AdminSecure!2026');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  
  console.log('Current URL:', page.url());
  
  const content = await page.content();
  if (content.includes('405') || content.includes('Method Not Allowed')) {
    console.log('ERROR: 405 Method Not Allowed');
  } else {
    console.log('SUCCESS');
  }
  
  await browser.close();
})();

