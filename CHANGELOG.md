# Changelog

## Unreleased

- `i18next-cli lint` checks `.astro` files: hardcoded text in the template and interpolation parameters of `t()` calls in the frontmatter and template, reported on the lines of the `.astro` file. Needs i18next-cli 1.91.4 or newer, which parses the plugin's code for `lint` as TSX.

## 1.0.0

- First release: `i18next-cli extract` and `status` find the translation keys in `.astro` files: frontmatter, template expressions and client `<script>` bodies.
