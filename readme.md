# vfile-reporter

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[vfile][] utility to create a report.

![Example screenshot of vfile-reporter][screenshot]

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`reporter(files[, options])`](#reporterfiles-options)
    *   [`Options`](#options)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package create a textual report from files showing the warnings that
occurred while processing.
Many CLIs of tools that process files, whether linters (such as ESLint) or
bundlers (such as esbuild), have similar functionality.

## When should I use this?

You can use this package whenever you want to display a report about what
occurred while processing to a human.

There are [other reporters][reporters] that display information differently
listed in vfile.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install vfile-reporter
```

In Deno with [`esm.sh`][esmsh]:

```js
import {reporter} from 'https://esm.sh/vfile-reporter@7'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {reporter} from 'https://esm.sh/vfile-reporter@7?bundle'
</script>
```

## Use

Say our module `example.js` looks as follows:

```js
import {VFile} from 'vfile'
import {reporter} from 'vfile-reporter'

const one = new VFile({path: 'test/fixture/1.js'})
const two = new VFile({path: 'test/fixture/2.js'})

one.message('Warning!', {line: 2, column: 4})

console.error(reporter([one, two]))
```

…now running `node example.js` yields:

```txt
test/fixture/1.js
  2:4  warning  Warning!

test/fixture/2.js: no issues found

⚠ 1 warning
```

## API

This package exports the identifier [`reporter`][api-reporter].
That value is also the `default` export.

### `reporter(files[, options])`

Create a report from one or more files.

###### Parameters

*   `files` ([`Array<VFile>`][vfile] or `VFile`)
    — files to report
*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Report (`string`).

### `Options`

Configuration (TypeScript type).

###### Fields

*   `color` (`boolean`, default: default: `true` when in Node.js and
    [color is supported][supports-color], or `false`)
    — use ANSI colors in report
*   `verbose` (`boolean`, default: `false`)
    — show message [`note`][message-note]s; notes are optional, additional,
    long descriptions
*   `quiet` (`boolean`, default: `false`)
    — do not show files without messages
*   `silent` (`boolean`, default: `false`)
    — show errors only; this hides info and warning messages, and sets
    `quiet: true`
*   `defaultName` (`string`, default: `'<stdin>'`)
    — Label to use for files without file path; if one file and no `defaultName`
    is given, no name will show up in the report

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `vfile-reporter@^7`,
compatible with Node.js 12.

## Security

Use of `vfile-reporter` is safe.

## Related

*   [`vfile-reporter-json`](https://github.com/vfile/vfile-reporter-json)
    — create a JSON report
*   [`vfile-reporter-pretty`](https://github.com/vfile/vfile-reporter-pretty)
    — create a pretty report
*   [`vfile-reporter-junit`](https://github.com/kellyselden/vfile-reporter-junit)
    — create a jUnit report
*   [`vfile-reporter-position`](https://github.com/Hocdoc/vfile-reporter-position)
    — create a report with content excerpts

## Contribute

See [`contributing.md`][contributing] in [`vfile/.github`][health] for ways to
get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organisation, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/vfile/vfile-reporter/workflows/main/badge.svg

[build]: https://github.com/vfile/vfile-reporter/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/vfile/vfile-reporter.svg

[coverage]: https://codecov.io/github/vfile/vfile-reporter

[downloads-badge]: https://img.shields.io/npm/dm/vfile-reporter.svg

[downloads]: https://www.npmjs.com/package/vfile-reporter

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=vfile-reporter

[size]: https://bundlejs.com/?q=vfile-reporter

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/vfile/vfile/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[contributing]: https://github.com/vfile/.github/blob/main/contributing.md

[support]: https://github.com/vfile/.github/blob/main/support.md

[health]: https://github.com/vfile/.github

[coc]: https://github.com/vfile/.github/blob/main/code-of-conduct.md

[license]: license

[author]: https://wooorm.com

[vfile]: https://github.com/vfile/vfile

[reporters]: https://github.com/vfile/vfile#reporters

[supports-color]: https://github.com/chalk/supports-color

[message-note]: https://github.com/vfile/vfile-message#note

[screenshot]: screenshot.png

[api-reporter]: #reporterfiles-options

[api-options]: #options
