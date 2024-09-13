const PROXY = process.env.SCRAPER_PROXY || null;
const TIME_OUT = Number(process.env.TIME_OUT) * 1000;
const VIEW_PORT = { width: 1280, height: 800 };
const CONFIG = {
  headless: process.env.NODE_ENV !== 'development',
  args: [
    '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
    '--window-size=1200,800',
    '--incognito',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    `${PROXY ? PROXY : ''}`,
  ],
};

export { CONFIG, TIME_OUT, VIEW_PORT };
