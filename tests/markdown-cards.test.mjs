import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCardOpening, splitMarkdownBlocks } from '../lib/markdown-blocks.ts';

test('card fences retain multiple paragraphs as one block', () => {
  const blocks = splitMarkdownBlocks('Einleitung\n\n:::hinweis\nErster Absatz\n\nZweiter Absatz\n:::\n\nDanach');
  assert.deepEqual(blocks, ['Einleitung', ':::hinweis\nErster Absatz\n\nZweiter Absatz\n:::', 'Danach']);
});

test('all editor card variants remain intact', () => {
  for (const kind of ['hinweis', 'warnung', 'info', 'neutral', 'farbe']) {
    assert.deepEqual(splitMarkdownBlocks(`:::${kind}\nInhalt\n:::`), [`:::${kind}\nInhalt\n:::`]);
  }
});

test('a card can have its own title without splitting the content', () => {
  assert.deepEqual(parseCardOpening(':::hinweis Mein eigener Titel'), { kind: 'hinweis', title: 'Mein eigener Titel' });
  assert.deepEqual(splitMarkdownBlocks(':::hinweis Mein eigener Titel\nErster Absatz\n\nZweiter Absatz\n:::'), [':::hinweis Mein eigener Titel\nErster Absatz\n\nZweiter Absatz\n:::']);
  assert.deepEqual(parseCardOpening(':::hinweis'), { kind: 'hinweis', title: '' });
});
