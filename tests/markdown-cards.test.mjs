import assert from 'node:assert/strict';
import test from 'node:test';
import { splitMarkdownBlocks } from '../lib/markdown-blocks.ts';

test('card fences retain multiple paragraphs as one block', () => {
  const blocks = splitMarkdownBlocks('Einleitung\n\n:::hinweis\nErster Absatz\n\nZweiter Absatz\n:::\n\nDanach');
  assert.deepEqual(blocks, ['Einleitung', ':::hinweis\nErster Absatz\n\nZweiter Absatz\n:::', 'Danach']);
});

test('all editor card variants remain intact', () => {
  for (const kind of ['hinweis', 'warnung', 'info', 'neutral', 'farbe']) {
    assert.deepEqual(splitMarkdownBlocks(`:::${kind}\nInhalt\n:::`), [`:::${kind}\nInhalt\n:::`]);
  }
});
