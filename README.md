# i18next-cli-plugin-astro

An [i18next-cli](https://github.com/i18next/i18next-cli) plugin that lets `extract` and `status` find the translation keys in `.astro` files.

Without it, i18next-cli reads only `.js`, `.jsx`, `.ts` and `.tsx`: the keys of your Astro pages stay unseen, and `status` reports 100% while a translation is missing.

## Install

```bash
npm install --save-dev i18next-cli i18next-cli-plugin-astro
```

Requires Node.js 22.12 or newer and i18next-cli 1.50.1 or newer.

## Configure

Add the plugin to `plugins` and include `astro` in `extract.input`:

```ts
// i18next.config.ts
import { defineConfig } from 'i18next-cli'
import astro from 'i18next-cli-plugin-astro'

export default defineConfig({
  locales: ['en', 'de'],
  extract: {
    input: 'src/**/*.{astro,ts}',
    output: 'src/locales/{{language}}/{{namespace}}.json'
  },
  plugins: [astro()]
})
```

A page like this one:

```astro
---
import i18next from '../i18n'
const t = i18next.getFixedT(Astro.currentLocale, 'home')
const title = t('title')
---
<h1>{title}</h1>
<p>{t('greeting', { name: 'Anna' })}</p>
<p>{t('loaves', { count: 3 })}</p>
```

gives `home:title`, `home:greeting`, `home:loaves_one` and `home:loaves_other` (with the plural forms of each language).

## Fail the build on a missing translation

`i18next-cli status` exits with a non-zero code when a key has no translation in a language, so run it before the build:

```json
{
  "scripts": {
    "build": "i18next-cli status && astro build"
  }
}
```

## What it reads

- the frontmatter between the `---` fences
- every `{...}` expression of the template, attribute values and markup nested in `.map()` or a ternary included
- the bodies of client `<script>` tags (bare, `type="module"` and `is:inline`)

The frontmatter and the template share one scope, as in Astro, so a `t` from `getFixedT(lang, 'ns')` in the frontmatter keeps its namespace in the template.

`lint` and `instrument` do not read `.astro` files yet.

## How it works

The plugin converts each `.astro` file with [`@astrojs/astro2tsx`](https://www.npmjs.com/package/@astrojs/astro2tsx), the converter behind Astro's editor tooling, and hands the result to i18next-cli's own extractor. So everything i18next-cli finds in a `.tsx` file it finds in an `.astro` file too.

## License

MIT
