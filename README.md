# personal-website

Personal site for Seth Jones — PhD student in Computer Science at UCF, researching
software engineering for AI at SAIL@UCF.

Built with [Astro](https://astro.build). Static output.

## Commands

Run from the project root:

| Command           | Action                                           |
| :---------------- | :----------------------------------------------- |
| `npm install`     | Install dependencies                             |
| `npm run dev`     | Start the dev server at `localhost:4321`         |
| `npm run build`   | Build the production site to `./dist/`           |
| `npm run preview` | Preview the build locally before deploying       |
| `npm run check`   | Typecheck with `astro check`                     |

## Structure

```text
src/
├── assets/       source images, processed at build time
├── components/   SiteHeader, SiteNav, SiteFooter
├── layouts/      BaseLayout — wraps every page
├── pages/        file-based routes
├── styles/       tokens.css (design tokens), global.css
└── consts.ts     site metadata and nav definition
specs/            behavioral specs, one per feature
```

Design tokens live in `src/styles/tokens.css` as CSS custom properties — primitives
plus a semantic layer remapped for dark mode. Components reference semantic tokens
only, never raw values.
