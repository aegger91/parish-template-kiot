# Kiot: Orthodox parish website template

Kiot is a website template for an Orthodox parish, shown here with a sample parish, St. Example Greek Orthodox Church. It has a Byzantine look: burgundy and gold on ivory, arched icon frames, GFS Didot headings and Literata body text. The site ships in English and Greek, and you can add more languages.

It builds to plain static files. Every page is a folder with its own `index.html`, and there is a `404.html`. It needs no server, database or CMS.

## Run it

Requires Node 22.23 or newer.

```bash
npm install
npm run dev        # http://127.0.0.1:4327
npm run build      # checks content, then writes the site to dist/
npm run preview    # serves dist/ at http://127.0.0.1:4328
```

To host the site under a sub-path, set `BASE_PATH` when building, for example `BASE_PATH=/kiot/ npm run build`.

## Edit the content

All text and settings live in `content/*.json`. Each file has a matching JSON Schema in `schemas/` that describes every field, so editors such as VS Code and the OrthodoxConnect builder can check your changes as you type. `npm run validate` checks all files and the links between them.

| File | What it holds |
| --- | --- |
| `site.json` | Parish name, languages, logo, contact details, calendar, modules on or off |
| `pages.json` | Menu order, pages, and the sections on each page |
| `ui.json` | Button labels and messages in each language |
| `services.json`, `feasts.json` | Weekly services, feast services, one-off services |
| `clergy.json`, `history.json`, `gallery.json`, `news.json`, `sermons.json` | Our Parish and media content |
| `store.json`, `parish-services.json`, `zapiski.json`, `get-involved.json` | The four optional modules |
| `image-sources.json` | Credits for public domain icons |

The sample text is short neutral placeholder copy, such as "Welcome text goes here." The template has no explainer or how-to pages. Each parish adds its own wording.

Things to know:

- **Welcome and About blocks.** The Home page has a `home-welcome` text section and Our Parish has a `parish-about` text section (type `richText`). Edit the text, or set `"enabled": false` to hide them.
- **Ids are stable.** Every item has an `id`. Change the text freely, but keep the id.
- **Translations.** Any text field can be a plain string or one entry per language, like `{ "en": "Vespers", "el": "Εσπερινός" }`. A missing language falls back to the default language.
- **Languages.** Add a language to `site.languages` (with `dir: "rtl"` for right-to-left scripts) and add its text to the fields. The language switcher adapts to any count.
- **Sections.** Each page has a `sections` list. Move a section in the list to reorder it. Add `"enabled": false` to hide it.
- **Modules.** `site.features` turns the Store, Request a Service, Commemorations and Candles, Get Involved, livestream and donations on or off. A module that is off disappears from the menu, pages and sections.
- **Logo.** `site.logo.style` is `kiot` (arched icon frame), `seal`, `square` (your own image) or `wordmark`.
- **Calendar.** `site.calendar.style` is `revised-julian`, `julian` or `gregorian`.
- **Newsletter.** The footer sign-up form appears only when `orthodoxConnect.newsletter.enabled` is true.

## Connect payments and forms

All payments, form posts and sign-ups go through `src/lib/handlers.ts`. Each function is a placeholder marked `TODO` that logs the request and returns success, so the site works as a demo. Replace them with calls to your payment provider and to OrthodoxConnect.

## Other scripts

- `npm run check:layout` loads every page in every language at 360, 390, 768, 1280 and 1440 px wide and reports horizontal overflow, cut-off labels and script errors. Run it against `npm run preview`.
- `npm run screenshots` saves desktop and mobile screenshots of key pages to `screenshots/`.
- `npm run zip` packs `dist/` into `parish-template-kiot-dist.zip` with the files at the zip root.
- `npm run illustrations` regenerates the line drawings in `public/images/illustrations/`.

The layout and screenshot scripts use Playwright with a local Chrome. Set `CHROME_PATH` if Chrome is not found.

## Images and credits

See [SOURCES.md](SOURCES.md).
