// <script> types that hold JavaScript or TypeScript. Event attributes are snippets
// (`return false`) that do not parse on their own; json, raw and unknown are not code.
const CODE_SCRIPTS = new Set(['processed-module', 'module', 'inline'])

/**
 * Lets i18next-cli read `.astro` files: frontmatter, template expressions and
 * client `<script>` bodies become one TSX module for the built-in extractor.
 *
 * @returns {import('i18next-cli').Plugin}
 */
export default function astro () {
  return {
    name: 'i18next-cli-plugin-astro',
    async onLoad (code, path) {
      if (!/\.astro$/i.test(path)) return undefined
      // Loaded on the first .astro file: the WASM converter costs ~130 MB of memory.
      const { convertToTsx } = await import('@astrojs/astro2tsx')
      const tsx = convertToTsx(code, { filename: path })
      // ponytail: key locations are TSX lines, a few lines below the .astro ones;
      // remap through tsx.mappings if a plugin ever needs exact lines.
      const scripts = tsx.scripts.filter(s => CODE_SCRIPTS.has(s.type)).map(s => s.content)
      return [tsx.code, ...scripts].join('\n')
    }
  }
}
