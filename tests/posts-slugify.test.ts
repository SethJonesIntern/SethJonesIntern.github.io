import { describe, expect, it } from 'vitest';

import { slugify } from '../src/lib/posts';

// Covers Behavior rows 1-13, and the Boundaries rows
// "unicode / accents / emoji / non-Latin titles" (#6-#8, #11, #12) and the
// slugify half of "empty slugify result" (#12).
//
// Not tested (Boundaries, marked "Do not test"): "very long title (500+ chars)".

describe('slugify', () => {
  it('replaces a space with a hyphen', () => {
    // Behavior #1
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('lowercases mixed-case words', () => {
    // Behavior #2
    expect(slugify('Building a Spec Harness')).toBe('building-a-spec-harness');
  });

  it('turns punctuation into separators and then collapses and trims them', () => {
    // Behavior #3
    expect(slugify('Tags, RSS & Drafts!')).toBe('tags-rss-drafts');
  });

  it('collapses a run of consecutive separators into one hyphen', () => {
    // Behavior #4
    expect(slugify('a  --  b')).toBe('a-b');
  });

  it('strips leading and trailing separators', () => {
    // Behavior #5
    expect(slugify('  -Hello-  ')).toBe('hello');
  });

  it('drops combining marks from accented Latin letters', () => {
    // Behavior #6: NFD decomposition, then U+0300-U+036F deleted
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('decomposes a dotted capital I and drops the dot before lowercasing', () => {
    // Behavior #7: NFD(U+0130) = 'I' + U+0307, mark dropped, then lowered
    expect(slugify('İstanbul')).toBe('istanbul');
  });

  it('turns a sharp s into a separator because it has no decomposition', () => {
    // Behavior #8
    expect(slugify('Straße')).toBe('stra-e');
  });

  it('deletes a typographic apostrophe instead of replacing it', () => {
    // Behavior #9 (U+2019)
    expect(slugify('Seth’s Site')).toBe('seths-site');
  });

  it('deletes a straight apostrophe instead of replacing it', () => {
    // Behavior #9 (U+0027)
    expect(slugify("don't")).toBe('dont');
  });

  it('keeps digits and turns a colon into a separator', () => {
    // Behavior #10
    expect(slugify('Issue 7: Blog with Tags')).toBe('issue-7-blog-with-tags');
  });

  it('turns an emoji into a separator that is then trimmed away', () => {
    // Behavior #11
    expect(slugify('Ship it 🚀')).toBe('ship-it');
  });

  it.each([
    ['non-Latin script', '日本語'],
    ['only punctuation', '!!!'],
    ['the empty string', ''],
    ['only whitespace', '   '],
  ])('returns the empty string for %s', (_label, input) => {
    // Behavior #12
    expect(slugify(input)).toBe('');
  });

  it('leaves an already-slugified title unchanged', () => {
    // Behavior #13
    expect(slugify('hello-world')).toBe('hello-world');
  });
});
