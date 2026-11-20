# i18next-cli-plugin-astro

An [i18next-cli](https://github.com/i18next/i18next-cli) plugin that lets `extract` and `status` find the translation keys in `.astro` files, and `lint` check them.

Without it, i18next-cli reads only JavaScript and TypeScript files (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`): the keys of your Astro pages stay unseen, and `status` reports 100% while a translation is missing.

## Install

```bash
npm install --save-dev i18next-cli i18next-cli-plugin-astro
```

Requires Node.js 22.12 or newer and i18next-cli 1.92.0 or newer.

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

i18next-cli reads a function named `getT` as next-i18next's `getT(ns, options)`. If your own helper takes the language first, `getT(lang, 'home')`, say so in the config, or `t('title')` ends up as `home.title` in the default namespace instead of `title` in `home`:

```ts
extract: {
  // …
  useTranslationNames: [{ name: 'getT', nsArg: 1, keyPrefixArg: 2 }]
}
```

`instrument` does not read `.astro` files yet.

## Lint

`i18next-cli lint` checks `.astro` files like `.tsx` files: hardcoded text in the template, and `t()` calls in the frontmatter and template whose interpolation parameters do not match the translation. Issues are reported on the lines of the `.astro` file:

```text
src/pages/[lang]/index.astro
  8: Error: Found hardcoded string: "Opening hours"
  3: Error: Interpolation issue: "Parameter "nam" is not used in translation string"
```

An HTML comment skips the next line:

```astro
<!-- i18next-instrument-ignore-next-line -->
<kbd>Esc</kbd>
```

## How it works

The plugin converts each `.astro` file with [`@astrojs/astro2tsx`](https://www.npmjs.com/package/@astrojs/astro2tsx), the converter behind Astro's editor tooling, and hands the result to i18next-cli's own extractor and linter. So everything i18next-cli finds in a `.tsx` file it finds in an `.astro` file too.

## License

MIT
