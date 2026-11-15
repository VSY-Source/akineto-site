// Dependency-free Edge CDP smoke test. Run with the local site on :8765 and
// headless Edge listening on :9222. Screenshots are written to previews/.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('previews');
await mkdir(outputDir, { recursive: true });
const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let sequence = 0;
const pending = new Map();
const listeners = new Map();
const errors = [];
const networkErrors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) item.reject(new Error(JSON.stringify(message.error)));
    else item.resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.text.includes('The message port closed before a response was received')) errors.push(message.params.entry);
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
    networkErrors.push({ status: message.params.response.status, url: message.params.response.url });
  }
  const callbacks = listeners.get(message.method);
  if (callbacks) [...callbacks].forEach(callback => callback(message.params));
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
function waitForEvent(method, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      listeners.get(method)?.delete(callback);
      reject(new Error(`Event timeout: ${method}`));
    }, timeout);
    const callback = params => {
      clearTimeout(timer);
      listeners.get(method)?.delete(callback);
      resolve(params);
    };
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(callback);
  });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(outputDir, name), Buffer.from(result.data, 'base64'));
}
async function viewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}
async function navigate(url) {
  const loaded = waitForEvent('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;
  await evaluate('document.fonts.ready.then(() => true)');
  await delay(900);
}
async function keyEscape() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
}
const checks = {};
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await viewport(1440, 1000);
  await navigate('http://127.0.0.1:8765/index.html');
  checks.homeDesktop = await evaluate(`({
    title: document.title,
    page: document.body.dataset.page,
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    menuLinks: document.querySelectorAll('.site-menu__link').length,
    tracks: document.querySelectorAll('.track.is-enhanced').length,
    realWaveBars: document.querySelectorAll('.track__wave i').length,
    trackInfo: [...document.querySelectorAll('.track')].map(track => ({title: track.querySelector('h3').textContent, source: track.querySelector('audio').getAttribute('src'), duration: track.querySelector('audio').duration})),
    heroImagesLoaded: [...document.querySelectorAll('.hero__portrait img')].every(img => img.complete && img.naturalWidth > 0)
  })`);
  await screenshot('home-desktop.png');

  await evaluate(`document.querySelector('[data-art-switch="alt"]').click()`);
  await delay(650);
  checks.artSwitch = await evaluate(`({
    active: document.querySelector('.hero__portrait img.is-active').dataset.art,
    label: document.querySelector('[data-art-label]').textContent,
    pressed: document.querySelector('[data-art-switch="alt"]').getAttribute('aria-pressed')
  })`);
  await evaluate(`document.querySelector('[data-art-switch="stand"]').click()`);
  await evaluate(`document.querySelector('#voicebanks').scrollIntoView()`);
  await delay(900);
  await screenshot('home-voicebanks.png');

  await evaluate(`document.querySelector('#demo').scrollIntoView(); document.querySelector('.track__play').click()`);
  await delay(1700);
  checks.audio = await evaluate(`(() => { const a = document.querySelector('.track audio'); return {
    playing: !a.paused,
    currentTime: a.currentTime,
    duration: a.duration,
    elapsedBars: document.querySelectorAll('.track__wave i.is-past').length,
    status: document.querySelector('[data-player-status]').textContent
  }; })()`);
  await screenshot('home-demo.png');
  await evaluate(`(() => { const s = document.querySelector('[data-seek]'); s.value = '500'; s.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await delay(1500);
  checks.audioSeek = await evaluate(`(() => { const a = document.querySelector('.track audio'); return {expected: a.duration / 2, actual: a.currentTime, seekValue: document.querySelector('[data-seek]').value, paused: a.paused, readyState: a.readyState, networkState: a.networkState, seekable: a.seekable.length ? [a.seekable.start(0), a.seekable.end(0)] : [], buffered: a.buffered.length ? [a.buffered.start(0), a.buffered.end(0)] : [], error: a.error?.code || null}; })()`);
  await evaluate(`document.querySelectorAll('.track__play')[1].click()`);
  await delay(350);
  checks.audioExclusive = await evaluate(`({firstPaused: document.querySelectorAll('.track audio')[0].paused, secondPlaying: !document.querySelectorAll('.track audio')[1].paused, secondCurrentTime: document.querySelectorAll('.track audio')[1].currentTime, secondDuration: document.querySelectorAll('.track audio')[1].duration})`);
  await evaluate(`document.querySelectorAll('.track__play')[1].click()`);
  await evaluate(`document.querySelector('.download-cta').scrollIntoView()`);
  await delay(900);
  await screenshot('home-download-cta.png');

  await evaluate(`scrollTo(0,0); document.querySelector('.menu-toggle').click()`);
  await delay(550);
  checks.menu = await evaluate(`({open: document.querySelector('.site-menu').open, expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), bodyLocked: document.body.classList.contains('menu-open')})`);
  await screenshot('site-menu-desktop.png');
  await keyEscape();
  await delay(250);
  checks.menuEscape = await evaluate(`!document.querySelector('.site-menu').open`);

  const characterLoaded = waitForEvent('Page.loadEventFired');
  await evaluate(`document.querySelector('.nav__link[data-page="character"]').click()`);
  await characterLoaded;
  await delay(900);
  checks.pageTransition = await evaluate(`({path: location.pathname, page: document.body.dataset.page, title: document.querySelector('.page-head').dataset.pageTitle, transitionCleared: !document.documentElement.classList.contains('is-transitioning')})`);
  await screenshot('character-desktop.png');
  checks.revealAtTop = await evaluate(`(() => { const el = document.querySelector('.char-visual'); return {classes: el.className, opacity: getComputedStyle(el).opacity}; })()`);
  await evaluate(`document.querySelector('.art-grid').scrollIntoView()`);
  await delay(1100);
  checks.revealAfterScroll = await evaluate(`(() => { const el = document.querySelector('.char-visual'); return {classes: el.className, opacity: getComputedStyle(el).opacity}; })()`);
  await screenshot('character-profile.png');
  await evaluate(`document.querySelector('.char-visual').click()`);
  await delay(250);
  checks.lightbox = await evaluate(`({open: document.querySelector('.lightbox').open, hasImage: !!document.querySelector('.lightbox img').src})`);
  await keyEscape();

  await navigate('http://127.0.0.1:8765/index.html');
  await evaluate(`document.querySelector('.theme-toggle').click()`);
  await delay(450);
  checks.lightTheme = await evaluate(`({theme: document.documentElement.dataset.theme, label: document.querySelector('.theme-toggle__label').textContent, bodyBackground: getComputedStyle(document.body).backgroundColor, bodyColor: getComputedStyle(document.body).color, heroBackground: getComputedStyle(document.querySelector('.hero')).backgroundColor})`);
  await delay(500);
  await screenshot('home-light.png');
  await evaluate(`document.querySelector('.theme-toggle').click()`);

  checks.innerPages = {};
  for (const name of ['voicebank', 'download', 'guide', 'news', 'terms', 'credits']) {
    await viewport(1280, 800);
    await navigate(`http://127.0.0.1:8765/${name}.html`);
    checks.innerPages[name] = await evaluate(`({
      page: document.body.dataset.page,
      title: document.querySelector('h1')?.textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
      menu: !!document.querySelector('.site-menu'),
      footer: !!document.querySelector('.site-footer')
    })`);
    if (name === 'download') {
      checks.downloadGate = await evaluate(`(() => {
        const card = document.querySelector('[data-download-card]');
        const before = card.querySelector('[data-download-btn]').getAttribute('aria-disabled');
        const checkbox = card.querySelector('[data-gate]');
        checkbox.click();
        return {before, after: card.querySelector('[data-download-btn]').getAttribute('aria-disabled'), hint: card.querySelector('.gate__hint').textContent};
      })()`);
      await screenshot('download-desktop.png');
    }
  }

  await viewport(390, 844, true);
  await navigate('http://127.0.0.1:8765/index.html');
  checks.homeMobile = await evaluate(`({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, toggleVisible: getComputedStyle(document.querySelector('.nav-toggle')).display, overflow: document.documentElement.scrollWidth > innerWidth})`);
  await screenshot('home-mobile.png');
  await evaluate(`document.querySelector('.nav-toggle').click()`);
  await delay(450);
  checks.mobileMenu = await evaluate(`({open: document.querySelector('.site-menu').open, links: document.querySelectorAll('.site-menu__link').length})`);
  await screenshot('site-menu-mobile.png');
  await keyEscape();

  await viewport(390, 844, true);
  await navigate('http://127.0.0.1:8765/download.html');
  checks.downloadMobile = await evaluate(`({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth})`);
  await screenshot('download-mobile.png');

  checks.runtimeErrors = errors;
  checks.networkErrors = networkErrors;
  await writeFile(path.join(outputDir, 'browser-report.json'), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
  socket.close();
}
