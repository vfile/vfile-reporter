/**
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').Text} Text
 * @typedef {import('mdast-util-mdx-jsx').MdxJsxTextElementHast} MdxJsxTextElementHast
 *
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import strip from 'strip-ansi'
import {VFile} from 'vfile'
import {VFileMessage} from 'vfile-message'
import {reporter} from 'vfile-reporter'

/* eslint-disable no-undef */
/** @type {Error} */
let exception
/** @type {Error} */
let changedMessage
/** @type {Error} */
let multilineException

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.stack = cleanStack(error_.stack, 3)
  exception = error_
}

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.message = 'foo'
  error_.stack = cleanStack(error_.stack, 3)
  changedMessage = error_
}

try {
  // @ts-expect-error
  variable = 1
} catch (error) {
  const error_ = /** @type {Error} */ (error)
  error_.message = 'foo\nbar\nbaz'
  error_.stack = cleanStack(error_.stack, 5)
  multilineException = error_
}
/* eslint-enable no-undef */

// @ts-expect-error: it’s assigned.
const causedCause = new Error('Boom!', {cause: exception})
causedCause.stack = cleanStack(causedCause.stack, 3)

test('reporter', async function () {
  assert.deepEqual(
    Object.keys(await import('vfile-reporter')).sort(),
    ['default', 'reporter'],
    'should expose the public api'
  )

  assert.equal(reporter([]), '', 'should return empty when not given files')

  assert.throws(
    function () {
      // @ts-expect-error: Removed support for passing nullish, which used to be supported.
      reporter()
    },
    /Unexpected value for `files`, expected one or more `VFile`s/,
    'should display a runtime error when an error is passed'
  )

  assert.throws(
    function () {
      // @ts-expect-error: Removed support for passing an error, which used to be supported.
      reporter(exception)
    },
    /Unexpected value for `files`, expected one or more `VFile`s/,
    'should display a runtime error when an error is passed'
  )

  assert.equal(
    strip(reporter(new VFile({path: 'a.js'}))),
    'a.js: no issues found',
    'should work on a single file'
  )

  assert.equal(
    strip(reporter(new VFile())),
    'no issues found',
    'should work without file-paths'
  )

  assert.equal(
    strip(reporter([new VFile({path: 'a.js'}), new VFile({path: 'b.js'})])),
    'a.js: no issues found\nb.js: no issues found',
    'should work on files without messages'
  )

  let file = new VFile({path: 'a.js'})
  file.message('Warning!')

  assert.equal(
    strip(reporter([file, new VFile({path: 'b.js'})])),
    [
      'a.js',
      ' warning Warning!',
      '',
      'b.js: no issues found',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should work on files with warnings'
  )

  file = new VFile({path: 'a.js'})

  try {
    file.fail('Error!')
  } catch {}

  assert.equal(
    strip(reporter([file, new VFile({path: 'b.js'})])),
    [
      'a.js',
      ' error Error!',
      '',
      'b.js: no issues found',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should work on files with errors'
  )

  file = new VFile({path: 'a.js'})

  try {
    file.fail('Error!')
  } catch {}

  file.message('Note!')
  file.message('Warning!')
  file.message('Another warning!')
  file.info('Another note!')

  try {
    file.fail('Another error!')
  } catch {}

  assert.equal(
    strip(reporter(file)),
    [
      'a.js',
      ' error   Another error!',
      ' error   Error!',
      ' warning Another warning!',
      ' warning Note!',
      ' warning Warning!',
      ' info    Another note!',
      '',
      '6 messages (✖ 2 errors, ⚠ 3 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages'
  )

  assert.equal(
    reporter(file, {color: false}),
    [
      'a.js',
      ' error   Another error!',
      ' error   Error!',
      ' warning Another warning!',
      ' warning Note!',
      ' warning Warning!',
      ' info    Another note!',
      '',
      '6 messages (✖ 2 errors, ⚠ 3 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages (w/o color)'
  )

  file = new VFile()
  Object.assign(file.message('Warning!'), {position: null})

  assert.equal(
    strip(reporter(file)),
    ' warning Warning!\n\n⚠ 1 warning',
    'should support a missing position'
  )

  file = new VFile()
  file.message('Warning!', {line: 3, column: 2})

  assert.equal(
    strip(reporter(file)),
    ['3:2 warning Warning!', '', '⚠ 1 warning'].join('\n'),
    'should support a single point'
  )

  file = new VFile()
  file.message('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  })

  assert.equal(
    strip(reporter(file)),
    ['3:2-4:8 warning Warning!', '', '⚠ 1 warning'].join('\n'),
    'should support a location'
  )

  file = new VFile()
  file.message('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  })
  file.basename = 'foo.bar'

  assert.equal(
    strip(reporter(file)),
    ['foo.bar', '3:2-4:8 warning Warning!', '', '⚠ 1 warning'].join('\n'),
    'should support a location (#2)'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(exception)
  } catch {}

  assert.equal(
    cleanStack(strip(reporter(file)), 3),
    [
      'test.js',
      ' error ReferenceError: variable is not defined',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error (show a stack)'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(exception, undefined, 'foo:bar')
  } catch {}

  assert.equal(
    cleanStack(strip(reporter(file)), 3),
    [
      'test.js',
      ' error ReferenceError: variable is not defined bar foo',
      '    at test.js:1:1'
    ].join('\n'),
    'should properly align a real error with a source'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(changedMessage)
  } catch {}

  assert.equal(
    cleanStack(strip(reporter(file)), 3),
    'test.js\n error ReferenceError: foo\n    at test.js:1:1',
    'should support a “real” error with a changed message'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(multilineException)
  } catch {}

  assert.equal(
    cleanStack(strip(reporter(file)), 5),
    [
      'test.js',
      ' error ReferenceError: foo',
      'bar',
      'baz',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error with a multiline message'
  )

  file = new VFile({path: 'test.js'})

  try {
    file.fail(multilineException, undefined, 'alpha:bravo')
  } catch {}

  assert.equal(
    cleanStack(strip(reporter(file)), 5),
    [
      'test.js',
      ' error ReferenceError: foo bravo alpha',
      'bar',
      'baz',
      '    at test.js:1:1'
    ].join('\n'),
    'should support a “real” error with a multiline message and a source'
  )

  file = new VFile({path: 'a.js'})
  file.message('Warning!')

  assert.equal(
    strip(reporter([file, new VFile({path: 'b.js'})], {quiet: true})),
    ['a.js', ' warning Warning!', '', '⚠ 1 warning'].join('\n'),
    'should ignore successful files in `quiet` mode'
  )

  file = new VFile({path: 'a.js'})
  const fileB = new VFile({path: 'b.js'})

  try {
    file.fail('Error!')
  } catch {}

  fileB.message('Warning!')

  assert.equal(
    strip(reporter([file, fileB], {silent: true})),
    ['a.js', ' error Error!', '', '✖ 1 error'].join('\n'),
    'should ignore non-failures in `silent` mode'
  )

  file = new VFile({path: 'a.js'})
  file.stem = 'b'

  assert.equal(
    strip(reporter(file)),
    'a.js: no issues found',
    'should support `history`'
  )

  file = new VFile({path: 'a.js'})
  file.stored = true

  assert.equal(
    strip(reporter(file)),
    'a.js: written',
    'should support `stored`'
  )

  assert.equal(
    reporter(file, {color: false}),
    'a.js: written',
    'should support `stored` (w/o color)'
  )

  file = new VFile({path: 'a.js'})
  file.stem = 'b'
  file.stored = true

  assert.equal(
    strip(reporter(file)),
    'a.js > b.js: written',
    'should expose the stored file-path'
  )

  assert.equal(
    reporter(new VFile({path: 'a.js'}), {color: true}),
    '\u001B[4m\u001B[32ma.js\u001B[39m\u001B[24m: no issues found',
    'should support `color: true`'
  )

  assert.equal(
    reporter(new VFile({path: 'a.js'}), {color: false}),
    'a.js: no issues found',
    'should support `color: false`'
  )

  assert.equal(
    strip(reporter(new VFile(), {defaultName: '<unknown>'})),
    '<unknown>: no issues found',
    'should support `defaultName`'
  )

  assert.equal(
    strip(reporter([new VFile()])),
    '<stdin>: no issues found',
    'should use `<stdin>` for files w/o path if multiple are given'
  )

  assert.equal(
    strip(reporter([new VFile()])),
    '<stdin>: no issues found',
    'should use `<stdin>` for files w/o path if multiple are given'
  )

  file = new VFile()
  file.message('Something failed terribly', {cause: exception})

  assert.equal(
    strip(reporter(file)),
    [
      ' warning Something failed terribly',
      '  [cause]:',
      '    ReferenceError: variable is not defined',
      '    at test.js:1:1',
      '    at ModuleJob.run (module_job:1:1)',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause`'
  )

  file = new VFile()

  file.message('Something failed terribly', {
    cause: causedCause
  })

  assert.equal(
    strip(reporter(file)),
    [
      ' warning Something failed terribly',
      '  [cause]:',
      '    Error: Boom!',
      '    at test.js:1:1',
      '    at ModuleJob.run (module_job:1:1)',
      '  [cause]:',
      '    ReferenceError: variable is not defined',
      '    at test.js:1:1',
      '    at ModuleJob.run (module_job:1:1)',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause`, w/ another cause'
  )

  file = new VFile()

  file.message('Something failed terribly', {
    cause: new VFileMessage('Boom!', {ruleId: 'foo', source: 'bar'})
  })

  assert.equal(
    strip(reporter(file)),
    [
      '     warning Something failed terribly',
      '  [cause]:',
      '     info    Boom!                     foo bar',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause` w/ a message'
  )

  file = new VFile()
  let message = file.message('Something failed terribly')
  message.cause = 'Boom!'

  assert.equal(
    strip(reporter(file)),
    [
      ' warning Something failed terribly',
      '  [cause]:',
      '    Boom!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause` set to a primitive'
  )

  file = new VFile()
  message = file.message('Something failed terribly')
  message.cause = {message: 'Boom!'}

  assert.equal(
    strip(reporter(file)),
    [
      ' warning Something failed terribly',
      '  [cause]:',
      '    Boom!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause` set to an object w/o stack'
  )

  file = new VFile()
  message = file.message('Something failed terribly')
  message.cause = {}

  assert.equal(
    strip(reporter(file)),
    [
      ' warning Something failed terribly',
      '  [cause]:',
      '    [object Object]',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a `message.cause` set to an object w/o stack or message'
  )

  /** @type {Text} */
  const text = {type: 'text', value: 'a'}
  /** @type {MdxJsxTextElementHast} */
  const jsx = {
    type: 'mdxJsxTextElement',
    name: 'b',
    attributes: [],
    children: [text]
  }
  /** @type {Element} */
  const element = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [jsx],
    position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
  }
  /** @type {Root} */
  const root = {
    type: 'root',
    children: [element],
    position: {start: {line: 1, column: 1}, end: {line: 1, column: 9}}
  }

  file = new VFile()
  file.message('x', {ancestors: [root, element, jsx, text]})

  assert.equal(
    strip(reporter(file)),
    ' warning x\n\n⚠ 1 warning',
    'should not show `message.ancestors` in normal mode'
  )

  assert.equal(
    strip(reporter(file, {verbose: true})),
    [
      ' warning x',
      '  [trace]:',
      '    at text',
      '    at mdxJsxTextElement<b>',
      '    at element<p> (1:1-1:9)',
      '    at root (1:1-1:9)',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support `message.ancestors` in verbose mode'
  )

  assert.equal(
    strip(reporter(file, {verbose: true, traceLimit: 2})),
    [
      ' warning x',
      '  [trace]:',
      '    at text',
      '    at mdxJsxTextElement<b>',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support `options.traceLimit`'
  )

  file = new VFile()
  Object.assign(file.message('Alpha'), {note: 'Bravo\ncharlie.'})

  assert.equal(
    strip(reporter(file, {verbose: true})),
    [
      ' warning Alpha',
      '  [note]:',
      '    Bravo',
      '    charlie.',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support `message.note` in verbose mode'
  )

  file = new VFile()
  Object.assign(file.message('Alpha'), {url: 'https://example.com'})

  assert.equal(
    strip(reporter(file, {verbose: true})),
    [
      ' warning Alpha',
      '  [url]:',
      '    https://example.com',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support `message.url` in verbose mode'
  )

  file = new VFile()
  file.message('a `b` c `` d `` e `` f ` g `` h ```')

  assert.equal(
    reporter(file),
    ' \u001B[33mwarning\u001B[39m \u001B[1ma \u001B[36m`b`\u001B[39m c \u001B[36m`` d ``\u001B[39m e \u001B[36m`` f ` g ``\u001B[39m h ```\u001B[22m\n\n\u001B[33m⚠\u001B[39m 1 warning',
    'should highlight markdown code in message reasons'
  )
})

/**
 * @param {string | undefined} stack
 * @param {number} max
 */
function cleanStack(stack, max) {
  return (stack || '')
    .replace(/\(.+[/\\]/g, '(')
    .replace(/file:.+\//g, '')
    .replace(/\d+:\d+/g, '1:1')
    .split('\n')
    .slice(0, max)
    .join('\n')
}
