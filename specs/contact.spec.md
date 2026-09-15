# Contact Page with Resume Download

Issue: personal-website #8. The contracts in `specs/layout-design-system.spec.md` (#1) and `specs/narrative-pages.spec.md` (#4) still apply: page shape, no new CSS, no client JS of the page's own (the site-wide nav script of `specs/workshop-unlock.spec.md` is not this page's).

## Purpose

Fill the dead `/contact/` nav route with one short page. It gives an email link, a GitHub link and a resume download. The email address is hidden from naive scrapers without JavaScript, and the link still works as a normal `mailto:`.

## Public API

Create only `src/pages/contact.astro`, which builds to `dist/contact/index.html`. It has the same shape as `about.astro`. It uses `<BaseLayout title="Contact" description="How to reach Seth Jones by email or on GitHub, with a download of his resume.">`. Leave out `width` and `bodyClass`. The content is direct children of the slot. No `class` attribute, no `<style>`, no `<script>`, no `on*` attributes. Do not modify `public/seth-jones-resume.pdf`, `consts.ts` or any CSS.

**Copy is a draft for Seth. Ship it word for word.** `’` is U+2019. The children of `<main>`, in order, are `h1, p, p, p`:
- h1: `Contact`
- p1: `Email is the best way to reach me: ` then `<a href="mailto:Seth.Jones@ucf.edu">Seth.Jones@ucf.edu</a>` then `.`
- p2: `My code is on GitHub at ` then `<a href="https://github.com/SethJonesIntern">github.com/SethJonesIntern</a>` then `.`
- p3: `If you’d like everything in one document, here’s my ` then `<a href="/seth-jones-resume.pdf" download>resume (PDF)</a>` then `.`

**How the email is hidden:** in the emitted HTML bytes, write every character of `Seth.Jones@ucf.edu` as an HTML numeric character reference (`&#83;&#101;…`). Do this in both the `href` value and the link text. `mailto:` may stay as literal text. Browsers decode the references, so users see a normal clickable link. **Limit:** this only stops scrapers that run a regex over the raw bytes. Anything that parses the HTML reads the address in plain text.

## Behavior

`raw` = bytes of `dist/contact/index.html`; `dom` = parsed DOM of the same file.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `npm run build`, `npm run check` | both exit 0; `dist/contact/index.html` exists | |
| 2 | `dom` | `document.title` = `Contact · Seth Jones`; meta description = literal above | U+00B7 |
| 3 | `dom` `<main>` | element children `h1, p, p, p`; `textContent` of each equals the concatenated copy above | e.g. p1 = `Email is the best way to reach me: Seth.Jones@ucf.edu.` |
| 4 | `dom` | exactly one `a[href^="mailto:"]`; `getAttribute('href')` = `mailto:Seth.Jones@ucf.edu`; text = `Seth.Jones@ucf.edu` | parsed, case preserved |
| 5 | `raw` | contains none of `ucf.edu`, `@ucf`, `Seth.Jones` (case-insensitive); does not match `/[\w.+-]+@[\w-]+\.[a-z]{2,}/i` | obfuscation AC |
| 6 | `raw` | contains `&#` at least 36 times | 18 characters × 2; decimal or hex both fine |
| 7 | `dom` | GitHub `<a>` has `href` = `https://github.com/SethJonesIntern` and text `github.com/SethJonesIntern`; no `target` | |
| 8 | `dom` | resume `<a>` has `href` = `/seth-jones-resume.pdf`, a `download` attribute, and text `resume (PDF)` | |
| 9 | `dist/seth-jones-resume.pdf` | exists, byte-identical to `public/seth-jones-resume.pdf`, starts with `%PDF-` | |
| 10 | every `dist/**/*.html` | no `tel:`; no match for `/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/` | phone AC, built site |
| 11 | `git grep -E '\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}' $(git rev-list --all)` | no output | phone AC, text history |
| 12 | `git log --all --format=%H -- "New folder"` | no output | the original resume was never committed |
| 13 | `dom` | nav link `/contact/` has `aria-current="page"` and `is-active`; no other nav link does | |
| 14 | `dom`; source | no `<script>` element on the page other than the site-wide nav script `SiteNav.astro` emits (`specs/workshop-unlock.spec.md`); `contact.astro` contains no `<script>` | no JS of the page's own (amended by #18; was "no `<script>`, no `.js` file in `dist/`") |

## Boundaries

- Case: the address is `Seth.Jones@ucf.edu` exactly, in both href and text. Test.
- Unicode: U+2019 and U+00B7 must appear correctly in parsed text. Test.
- Viewport: at 400px, `scrollWidth <= 400`. Below 320px is undefined; do not test.
- Empty, zero, negative, max, null, duplicate: no inputs of these kinds exist. Do not test.

## Invariants

1. The email address never appears as plain text in any built `.html` file. It appears only as numeric references on `/contact/`.
2. No built page or text file in git history contains a phone-number pattern.
3. Every fact in the copy comes from issue #8. There are no invented details such as office, hours or response time.

## Non-goals

- Changes to `FOOTER_LINKS`, the header or other pages. No contact form, `tel:` link, vCard, JSON-LD, or CSS-based text reversal.
- Re-redacting or re-checking the PDF (already done). No tests that parse the PDF's contents.

## Open questions

1. All copy is Seth's draft. Change it here first; tests assert these strings.
2. The phone check in the PDF cannot be automated because the streams are compressed and the project has no PDF parser. Seth should confirm by hand that the number was removed from the text layer, not just covered with a box.
3. Should GitHub, now confirmed by this issue, also go into `FOOTER_LINKS`? This is out of scope here.
4. Closed: the header line and Behavior 14 were amended for issue #18, which added a site-wide nav script (`specs/workshop-unlock.spec.md`). The page itself still ships no script.
