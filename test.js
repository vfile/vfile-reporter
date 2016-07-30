/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module vfile-reporter
 * @fileoverview Test suite for `vfile-reporter`.
 */

'use strict';

/* eslint-env node */

/* Dependencies. */
var test = require('tape');
var chalk = require('chalk');
var vfile = require('vfile');
var toVFile = require('to-vfile');
var reporter = require('./index.js');

var exception;

try {
  /* eslint-disable no-undef */
  variable = 1;
} catch (err) {
  err.stack = err.stack
    .replace(/\(\/.+\//g, '(').replace(/\d+:\d+/g, '1:1')
    .split('\n').slice(0, 3).join('\n');

  exception = err;
}

/* Tests. */
test('vfile-reporter', function (t) {
  var file;
  var fileB;
  var warning;

  t.equal(reporter(), '', 'should return empty without a file');

  t.equal(reporter([]), '', 'should return empty when not given files');

  t.equal(
    reporter(exception),
    exception.stack,
    'should support an error'
  );

  file = toVFile('a.js');
  file.quiet = true;
  warning = file.fail('Error!');

  t.equal(
    reporter(warning),
    'a.js:1:1: Error!',
    'should support a fatal message'
  );

  t.equal(
    chalk.stripColor(reporter(toVFile('a.js'))),
    'a.js: no issues found',
    'should work on a single file'
  );

  t.equal(
    chalk.stripColor(reporter(vfile())),
    'no issues found',
    'should work without file-paths'
  );

  t.equal(
    chalk.stripColor(reporter([toVFile('a.js'), toVFile('b.js')])),
    'a.js: no issues found\nb.js: no issues found',
    'should work on files without messages'
  );

  file = toVFile('a.js');
  file.messages.push(file.message('Note!'));

  t.equal(
    chalk.stripColor(reporter([file, toVFile('b.js')])),
    [
      'a.js',
      '        1:1  message  Note!',
      '',
      'b.js: no issues found'
    ].join('\n'),
    'should work on files with messages'
  );

  file = toVFile('a.js');
  file.warn('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, toVFile('b.js')])),
    [
      'a.js',
      '        1:1  warning  Warning!',
      '',
      'b.js: no issues found',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should work on files with warnings'
  );

  file = toVFile('a.js');
  file.quiet = true;
  file.fail('Error!');

  t.equal(
    chalk.stripColor(reporter([file, toVFile('b.js')])),
    [
      'a.js',
      '        1:1  error    Error!',
      '',
      'b.js: no issues found',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should work on files with errors'
  );

  file = toVFile('a.js');
  file.quiet = true;
  file.fail('Error!');
  file.messages.push(file.message('Note!'));
  file.warn('Warning!');
  file.warn('Another warning!');
  file.messages.push(file.message('Another note!'));
  file.fail('Another error!');

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'a.js',
      '        1:1  error    Error!',
      '        1:1  message  Note!',
      '        1:1  warning  Warning!',
      '        1:1  warning  Another warning!',
      '        1:1  message  Another note!',
      '        1:1  error    Another error!',
      '',
      '6 messages (✖ 2 errors, ⚠ 2 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages'
  );

  file = vfile();
  file.warn('Warning!', {line: 3, column: 2});

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      '        3:2  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a single position'
  );

  file = vfile();
  file.warn('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  });

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      '    3:2-4:8  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a location'
  );

  file = vfile();
  file.warn('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  });
  file.move({filename: 'foo', extension: 'bar'});

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'foo.bar',
      '    3:2-4:8  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a location (#2)'
  );

  file = toVFile('test.js');
  file.quiet = true;
  file.fail(exception);

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'test.js',
      '        1:1  error    ReferenceError: variable is not defined',
      '    at Object.<anonymous> (test.js:1:1)',
      '    at Module._compile (module.js:1:1)',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should support a “real” error (show a stack)'
  );

  file = toVFile('a.js');
  warning = file.warn('Whoops');
  warning.note = 'Lorem ipsum dolor sit amet.';
  file.warn('...and some more warnings');

  t.equal(
    chalk.stripColor(reporter(file, {verbose: true})),
    [
      'a.js',
      '        1:1  warning  Whoops',
      'Lorem ipsum dolor sit amet.',
      '        1:1  warning  ...and some more warnings',
      '',
      '⚠ 2 warnings'
    ].join('\n'),
    'should support `note` in verbose mode'
  );

  file = toVFile('a.js');
  file.warn('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, toVFile('b.js')], {quiet: true})),
    [
      'a.js',
      '        1:1  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should ignore successful files in `quiet` mode'
  );

  file = toVFile('a.js');
  fileB = toVFile('b.js');
  file.quiet = true;
  file.fail('Error!');
  fileB.warn('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, fileB], {silent: true})),
    [
      'a.js',
      '        1:1  error    Error!',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should ignore non-failures in `silent` mode'
  );

  file = toVFile('a.js');
  file.move({filename: 'b'});

  t.equal(
    chalk.stripColor(reporter(file)),
    'a.js: no issues found',
    'should support `history`'
  );

  file = toVFile('a.js');
  file.stored = true;

  t.equal(
    chalk.stripColor(reporter(file)),
    'a.js: written',
    'should support `stored`'
  );

  file = toVFile('a.js');
  file.move({filename: 'b'});
  file.stored = true;

  t.equal(chalk.stripColor(reporter(file)), 'a.js > b.js: written', 'should expose the stored file-path');

  t.equal(reporter(toVFile('a.js'), {color: false}), 'a.js: no issues found', 'should support `color: false`');

  t.end();
});
