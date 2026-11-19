import astro from '../../index.js'

export default {
  locales: ['en', 'de'],
  extract: {
    input: 'src/**/*.astro',
    output: 'locales/{{language}}/{{namespace}}.json'
  },
  plugins: [astro()]
}
