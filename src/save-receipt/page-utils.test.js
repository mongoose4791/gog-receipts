import test from 'node:test';
import assert from 'node:assert/strict';

import {collectPreviewLinks, extractPurchaseDate} from './page-utils.js';

class FakeAnchor {
    constructor(href) {
        this._href = href;
    }
    getAttribute(name) {
        if (name === 'href') {
            return this._href;
        }
        return null;
    }
}

class FakeSpan {
    constructor(text, boldText) {
        this.textContent = text;
        this._bold = boldText ? new FakeBold(boldText) : null;
    }
    querySelector(sel) {
        if (sel === 'b') {
            return this._bold;
        }
        return null;
    }
}

class FakeBold {
    constructor(text) {
        this.textContent = text;
    }
}

class FakePage {
    constructor({anchors = [], spans = []} = {}) {
        this._anchors = anchors;
        this._spans = spans;
    }
    async evaluate(fn, ...args) {
        const doc = {
            querySelectorAll: (sel) => {
                if (sel === 'a[href]') {
                    return this._anchors;
                }
                if (sel === 'span') {
                    return this._spans;
                }
                return [];
            },
        };
        const prev = globalThis.document;
        try {
            globalThis.document = doc;
            return await fn(...args);
        } finally {
            if (prev === undefined) {
                delete globalThis.document;
            } else {
                globalThis.document = prev;
            }
        }
    }
}

test('collectPreviewLinks filters and absolutizes only matching preview URLs', async () => {
    const anchors = [
        new FakeAnchor('/en/email/preview/abcdef'),              // relative, valid
        new FakeAnchor('https://www.gog.com/en/email/preview/1234abcd'), // absolute, valid
        new FakeAnchor('https://www.gog.com/en/email/preview/XYZ'),      // invalid (non-hex)
        new FakeAnchor('https://www.gog.com/en/account/settings/orders'), // not a preview
        new FakeAnchor('mailto:support@gog.com'), // not http(s)
    ];
    const page = new FakePage({anchors});
    const urls = await collectPreviewLinks(page);
    urls.sort();
    assert.deepEqual(urls, [
        'https://www.gog.com/en/email/preview/1234abcd',
        'https://www.gog.com/en/email/preview/abcdef',
    ]);
});

test('extractPurchaseDate returns the bolded date when span contains "Date of purchase"', async () => {
    const spans = [
        new FakeSpan('Some other text', null),
        new FakeSpan('Date of purchase', '2024-11-05'),
    ];
    const page = new FakePage({spans});
    const date = await extractPurchaseDate(page);
    assert.equal(date, '2024-11-05');
});

test('extractPurchaseDate returns null when no matching span is found', async () => {
    const spans = [new FakeSpan('Purchased on', '2023-08-01')];
    const page = new FakePage({spans});
    const date = await extractPurchaseDate(page);
    assert.equal(date, null);
});
