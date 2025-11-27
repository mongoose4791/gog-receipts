import test from 'node:test';
import assert from 'node:assert/strict';

import {waitForPageSettled} from './page-utils.js';

class FakePage {
    constructor() {
        this._waitCalls = 0;
        this._lastWaitOpts = undefined;
    }
    async waitForNetworkIdle(opts) {
        this._waitCalls += 1;
        this._lastWaitOpts = opts;
        return Promise.resolve();
    }
    async evaluate(fn, ...args) {
        const doc = {
            fonts: {ready: Promise.resolve()},
        };
        const prevDoc = globalThis.document;
        const prevRAF = globalThis.requestAnimationFrame;
        try {
            globalThis.document = doc;
            globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
            return await fn(...args);
        } finally {
            if (prevDoc === undefined) {
                delete globalThis.document;
            } else {
                globalThis.document = prevDoc;
            }
            if (prevRAF === undefined) {
                delete globalThis.requestAnimationFrame;
            } else {
                globalThis.requestAnimationFrame = prevRAF;
            }
        }
    }
}

test('waitForPageSettled waits for network idle and two RAF ticks', async () => {
    const page = new FakePage();
    await assert.doesNotReject(() => waitForPageSettled(page, 1234));
    assert.equal(page._waitCalls, 1);
    assert.equal(page._lastWaitOpts.timeout, 1234);
});
