// Karma configuration for Manage Repair Store Angular test suite
// Chrome binary resolved via CHROME_BIN env var, falling back to puppeteer-installed Chromium

const { existsSync } = require('fs');

const { existsSync, readdirSync } = require('fs');
const { join } = require('path');

const PUPPETEER_DIR = '/home/alejandro/.cache/puppeteer/chrome';
let PUPPETEER_CHROME = null;

if (existsSync(PUPPETEER_DIR)) {
  const versions = readdirSync(PUPPETEER_DIR);
  for (const v of versions) {
    const candidate = join(PUPPETEER_DIR, v, 'chrome-linux64', 'chrome');
    if (existsSync(candidate)) {
      PUPPETEER_CHROME = candidate;
      break;
    }
  }
}

if (!process.env.CHROME_BIN && PUPPETEER_CHROME && existsSync(PUPPETEER_CHROME)) {
  process.env.CHROME_BIN = PUPPETEER_CHROME;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/manage-repair-store'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadless: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu'],
      },
    },
    singleRun: false,
    restartOnFileChange: true,
  });
};
