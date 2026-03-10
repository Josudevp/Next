/**
 * Puppeteer browser singleton for server-side PDF generation.
 *
 * Problem: launching Chromium takes 3–8 seconds per request on Render's
 * free tier. Reusing a single browser instance collapses that cost to a
 * one-time startup penalty, making subsequent PDF exports essentially
 * instantaneous (they only pay the page-load + render time).
 *
 * Design:
 *  - `getBrowser()` returns the live browser, launching once if needed.
 *  - If the browser crashes, the next `getBrowser()` call automatically
 *    re-launches it (no manual intervention required).
 *  - `warmBrowser()` is called at server start so the first real request
 *    hits a warm browser, not a cold launch.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

let _browser = null;
let _launching = null; // pending launch promise — prevents concurrent launches

async function launch() {
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
        args: [
            ...chromium.args,
            '--disable-dev-shm-usage', // Prevent /dev/shm OOM on constrained containers
            '--no-zygote',             // Faster startup in single-process environments
        ],
        defaultViewport: { width: 816, height: 1056, deviceScaleFactor: 1 },
        executablePath,
        headless: true,
    });
}

/**
 * Returns the shared browser instance.
 * Launches on first call; auto-recovers after a crash.
 */
export async function getBrowser() {
    // Already live
    if (_browser && _browser.connected) return _browser;

    // Another coroutine is already launching — wait for it
    if (_launching) return _launching;

    // We are the one to launch
    _launching = launch().then((b) => {
        _browser = b;
        _launching = null;

        // Auto-recover: clear the reference when Chromium exits unexpectedly
        b.on('disconnected', () => {
            console.warn('[browserPool] Chromium disconnected — will re-launch on next request');
            _browser = null;
        });

        return b;
    });

    return _launching;
}

/**
 * Pre-warm the browser at server start.
 * Errors are non-fatal — the pool will retry on the first real request.
 */
export async function warmBrowser() {
    try {
        await getBrowser();
        console.log('✅ [browserPool] Chromium calentado y listo');
    } catch (err) {
        console.warn('[browserPool] Warm-up falló (no fatal):', err.message);
    }
}
