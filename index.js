// <script> types that hold JavaScript or TypeScript. Event attributes are snippets
// (`return false`) that do not parse on their own; json, raw and unknown are not code.
const CODE_SCRIPTS = new Set(['processed-module', 'module', 'inline'])

const isAstro = (path) => /\.astro$/i.test(path)

/**
 * Turns an `.astro` file into one TSX module: frontmatter, template and client
 * `<script>` bodies. `spans` are the stretches copied verbatim from the source,
 * as [tsxStart, length, sourceStart].
 */
async function toTsx (source, path) {
  // Loaded on the first .astro file: the WASM converter costs ~130 MB of memory.
  const { convertToTsx } = await import('@astrojs/astro2tsx')
  const tsx = convertToTsx(source, { filename: path })
  const spans = tsx.mappings.filter(([, vLength, , oLength]) => vLength === oLength).map(([v, length, o]) => [v, length, o])
  let code = tsx.code
  for (const script of tsx.scripts) {
    if (!CODE_SCRIPTS.has(script.type)) continue
    code += '\n'
    spans.push([code.length, script.content.length, script.position.start])
    code += script.content
  }
  return { code, spans }
}

const lineAt = (text, offset) => text.slice(0, offset).split('\n').length

/** The source line of a TSX line: through the first verbatim span on it, unchanged when there is none. */
function sourceLine ({ code, source, spans }, line) {
  const lines = code.split('\n')
  const start = lines.slice(0, line - 1).reduce((offset, text) => offset + text.length + 1, 0)
  const end = start + (lines[line - 1] ?? '').length
  let best
  for (const [v, length, o] of spans) {
    const from = Math.max(v, start)
    if (from <= end && from < v + length && (!best || from < best.from)) best = { from, o: o + from - v }
  }
  return best ? lineAt(source, best.o) : line
}

/**
 * Lets i18next-cli read `.astro` files: `extract` and `status` through `onLoad`,
 * `lint` through `lintOnLoad`, with lint issues reported on the `.astro` lines.
 *
 * @returns {import('i18next-cli').Plugin}
 */
export default function astro () {
  const linted = new Map()
  return {
    name: 'i18next-cli-plugin-astro',
    lintExtensions: ['.astro'],
    async onLoad (code, path) {
      if (!isAstro(path)) return undefined
      // ponytail: key locations are TSX lines, a few lines below the .astro ones; sourceLine() could remap them
      return (await toTsx(code, path)).code
    },
    async lintOnLoad (code, path) {
      if (!isAstro(path)) return undefined
      const tsx = await toTsx(code, path)
      linted.set(path, { ...tsx, source: code })
      return tsx.code
    },
    lintOnResult (path, issues) {
      const file = linted.get(path)
      if (!file) return undefined
      linted.delete(path)
      return issues.map(issue => issue.line > 0 ? { ...issue, line: sourceLine(file, issue.line) } : issue)
    }
  }
}
