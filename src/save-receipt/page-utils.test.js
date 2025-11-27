import test from 'node:test';
import assert from 'node:assert/strict';

import {extractPurchaseDate} from './page-utils.js';


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
    constructor({spans = []} = {}) {
        this._spans = spans;
    }
    async evaluate(fn, ...args) {
        const doc = {
            querySelectorAll: (sel) => {
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
