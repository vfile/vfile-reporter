# vfile-reporter [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

Format [**vfile**][vfile]s using a stylish reporter.

![Example screenshot of **vfile-reporter**][screenshot]

## Features

*   [x] Ranges
    — Not just a starting position, such as `3:2`, but `3:2-3:6`.
*   [x] Stack-traces
    — When something awful happens, you want to know **where** it occurred,
    stack-traces help answer that question.
*   [x] Successful files (configurable)
    — Sometimes you want to know if things went okay.
*   [x] And all of [**VFile**][vfile]s awesomeness.

## Installation

[npm][]:

```bash
npm install vfile-reporter
```

## Usage

Dependencies:

```javascript
var vfile = require('vfile');
var reporter = require('vfile-reporter');

var one = vfile({path: 'test/fixture/1.js'});
var two = vfile({path: 'test/fixture/2.js'});

one.message('Warning!', {line: 2, column: 4});

var report = reporter([one, two], {color: false});
```

Yields:

```txt
test/fixture/1.js
  2:4  warning  Warning!

test/fixture/2.js: no issues found

⚠ 1 warning
```

## API

### `reporter(files[, options])`

Generate a stylish report from the given files.

###### Parameters

*   `files` (`Error`, [`VFile`][vfile], or `Array.<VFile>`).
*   `options` (`object`, optional):
    *   `quiet` (`boolean`, default: `false`)
        — Do not output anything for a file which has no warnings or
        errors.  The default behaviour is to show a success message.
    *   `silent` (`boolean`, default: `false`)
        — Do not output messages without `fatal` set to true.
        Also sets `quiet` to `true`.
    *   `color` (`boolean`, default: `true`)
        — Whether to use colour.
    *   `defaultName` (`string`, default: `'<stdin>'`)
        — Label to use for files without file-path.
        If one file and no `defaultName` is given, no name
        will show up in the report.
    *   `context` (`integer`, default: `0`)
        — Print out the specified number of characters before
        and after the reported location above each message.

## License

[MIT][license] © [Titus Wormer][author]

Forked from [ESLint][]’s stylish reporter
(originally created by Sindre Sorhus), which is Copyright (c) 2013
Nicholas C. Zakas, and licensed under MIT.

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/vfile/vfile-reporter.svg

[travis]: https://travis-ci.org/vfile/vfile-reporter

[codecov-badge]: https://img.shields.io/codecov/c/github/vfile/vfile-reporter.svg

[codecov]: https://codecov.io/github/vfile/vfile-reporter

[npm]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[eslint]: https://github.com/eslint/eslint

[vfile]: https://github.com/vfile/vfile

[screenshot]: ./screenshot.png
