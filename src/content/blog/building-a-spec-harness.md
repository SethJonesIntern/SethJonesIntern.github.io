---
title: 'Building a Spec Harness for This Site'
date: '2026-09-14'
description: 'Why every feature on this site starts as a written spec, and what changed once the specs came before the code.'
tags: ['Testing', 'Process', 'Astro']
---

I build this site feature by feature, and every feature starts as a document rather than a file of
code. The spec names the exact module path, the exact exported functions, and a table of inputs with
the literal values they should return. Only then does anything get written.

The reason is narrower than it sounds. A spec that says “returns a list” is worth very little, but a
spec that says `slugify('Café Déjà Vu')` returns `'cafe-deja-vu'` is worth a lot, because someone who
has never seen my implementation can write a test from that line alone. That is the whole trick: the
person writing the tests works from the document, not from the code, so the tests check what I said I
would build instead of what I happened to build.

It has already caught things. Writing the slug rules down forced me to decide what happens to an
apostrophe, to an accent, to a title that is nothing but emoji, and to two different titles that
normalize to the same slug — questions I would otherwise have answered by accident, whichever way the
first implementation fell out.

The habit comes straight out of what I study. Agentic systems built on language models are hard to
test because they do not behave the same way twice, and the thing that survives that is a contract:
say what must be true, then check it. A personal site is a low-stakes place to practise.
