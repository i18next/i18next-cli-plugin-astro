import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findKeys } from 'i18next-cli'
import astro from '../index.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const fixture = here('./fixture')
const cli = here('../node_modules/i18next-cli/dist/esm/cli.js')

const run = (cwd, ...args) =>
  spawnSync(process.execPath, [cli, ...args, '-c', join(fixture, 'i18next.config.js')], { cwd, encoding: 'utf8' })

const copyFixture = (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-plugin-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  cpSync(fixture, dir, { recursive: true })
  return dir
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

test('extract finds the keys of frontmatter and template', (t) => {
  const dir = copyFixture(t)
  rmSync(join(dir, 'locales'), { recursive: true })
  const { status, stderr } = run(dir, 'extract')
  assert.equal(status, 0, stderr)
  const keys = ['description', 'hello', 'items_one', 'items_other', 'title']
  assert.deepEqual(Object.keys(readJson(join(dir, 'locales/en/translation.json'))), keys)
  assert.deepEqual(Object.keys(readJson(join(dir, 'locales/de/translation.json'))), keys)
})

test('status passes when every language is complete', (t) => {
  const { status, stdout, stderr } = run(copyFixture(t), 'status')
  assert.equal(status, 0, stdout + stderr)
  assert.match(stdout, /Keys Found:\s+5/)
})

test('status fails when a key is missing in a language', (t) => {
  const dir = copyFixture(t)
  const de = join(dir, 'locales/de/translation.json')
  const { description, ...rest } = readJson(de)
  writeFileSync(de, JSON.stringify(rest, null, 2))
  assert.notEqual(run(dir, 'status').status, 0)
})

test('lint reports hardcoded strings and interpolation problems on the .astro lines', (t) => {
  const dir = copyFixture(t)
  writeFileSync(join(dir, 'src/pages/[lang]/index.astro'), [
    '---',
    'const t = (key: string, options?: object) => key',
    "const greeting = t('hello', { nam: 'Ben' })",
    '---',
    '<h1>{greeting}</h1>',
    '<!-- i18next-instrument-ignore-next-line -->',
    '<kbd>Esc</kbd>',
    '<p>Opening hours</p>',
    "<p>{t('hello', { person: 'Cleo' })}</p>"
  ].join('\n'))
  const { status, stdout, stderr } = run(dir, 'lint')
  assert.equal(status, 1, stdout + stderr)
  const issues = stdout.split('\n').filter(line => /^\s+\d+: /.test(line)).map(line => line.trim())
  assert.deepEqual(issues, [
    '8: Error: Found hardcoded string: "Opening hours"',
    '3: Error: Interpolation issue: "Interpolation parameter "name" was not provided"',
    '3: Error: Interpolation issue: "Parameter "nam" is not used in translation string"',
    '9: Error: Interpolation issue: "Interpolation parameter "name" was not provided"',
    '9: Error: Interpolation issue: "Parameter "person" is not used in translation string"'
  ])
})

test('template expressions, attributes, nested markup and client scripts', async () => {
  const { allKeys } = await findKeys({
    locales: ['en'],
    extract: { input: [here('./edge.astro')], output: 'locales/{{language}}/{{namespace}}.json', functions: ['t', '*.t'] },
    plugins: [astro()]
  })
  assert.deepEqual([...allKeys.keys()].sort(), [
    'common:fm.heading',
    'common:tpl.attr',
    'common:tpl.else',
    'common:tpl.mapped',
    'common:tpl.sethtml',
    'common:tpl.slot',
    'common:tpl.ternary',
    'translation:script.inline',
    'translation:script.title'
  ])
})

test('leaves other files to the extractor', async () => {
  assert.equal(await astro().onLoad('const a = 1', 'src/a.ts'), undefined)
})
