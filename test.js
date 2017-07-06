'use strict';

var test = require('tape');
var chalk = require('chalk');
var vfile = require('vfile');
var reporter = require('./index.js');

/* eslint-disable no-undef */
var exception;
var changedMessage;
var multilineException;

try {
  variable = 1;
} catch (err) {
  err.stack = cleanStack(err.stack, 3);
  exception = err;
}

try {
  variable = 1;
} catch (err) {
  err.message = 'foo';
  err.stack = cleanStack(err.stack, 3);
  changedMessage = err;
}

try {
  variable = 1;
} catch (err) {
  err.message = 'foo\nbar\nbaz';
  err.stack = cleanStack(err.stack, 5);
  multilineException = err;
}
/* eslint-enable no-undef */

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

  file = vfile({path: 'a.js'});

  try {
    file.fail('Error!');
  } catch (err) {}

  t.equal(
    reporter(file.messages[0]),
    'a.js:1:1: Error!',
    'should support a fatal message'
  );

  t.equal(
    chalk.stripColor(reporter(vfile({path: 'a.js'}))),
    'a.js: no issues found',
    'should work on a single file'
  );

  t.equal(
    chalk.stripColor(reporter(vfile())),
    'no issues found',
    'should work without file-paths'
  );

  t.equal(
    chalk.stripColor(reporter([
      vfile({path: 'a.js'}),
      vfile({path: 'b.js'})
    ])),
    'a.js: no issues found\nb.js: no issues found',
    'should work on files without messages'
  );

  file = vfile({path: 'a.js'});
  file.message('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, vfile({path: 'b.js'})])),
    [
      'a.js',
      '  1:1  warning  Warning!',
      '',
      'b.js: no issues found',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should work on files with warnings'
  );

  file = vfile({path: 'a.js'});

  try {
    file.fail('Error!');
  } catch (err) {}

  t.equal(
    chalk.stripColor(reporter([file, vfile({path: 'b.js'})])),
    [
      'a.js',
      '  1:1  error  Error!',
      '',
      'b.js: no issues found',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should work on files with errors'
  );

  file = vfile({path: 'a.js'});

  try {
    file.fail('Error!');
  } catch (err) {}

  file.message('Note!');
  file.message('Warning!');
  file.message('Another warning!');
  file.message('Another note!');

  try {
    file.fail('Another error!');
  } catch (err) {}

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'a.js',
      '  1:1  error    Error!',
      '  1:1  warning  Note!',
      '  1:1  warning  Warning!',
      '  1:1  warning  Another warning!',
      '  1:1  warning  Another note!',
      '  1:1  error    Another error!',
      '',
      '6 messages (✖ 2 errors, ⚠ 4 warnings)'
    ].join('\n'),
    'should work on files with multiple mixed messages'
  );

  file = vfile();
  file.message('Warning!', {line: 3, column: 2});

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      '  3:2  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a single position'
  );

  file = vfile();
  file.message('Warning!', {
    start: {line: 3, column: 2},
    end: {line: 4, column: 8}
  });

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      '  3:2-4:8  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a location'
  );

  file = vfile();
  file.message('Warning!', {start: {line: 3, column: 2}, end: {line: 4, column: 8}});
  file.basename = 'foo.bar';

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'foo.bar',
      '  3:2-4:8  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support a location (#2)'
  );

  file = vfile({path: 'test.js'});

  try {
    file.fail(exception);
  } catch (err) {}

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'test.js',
      '  1:1  error  ReferenceError: variable is not defined',
      '    at Object.<anonymous> (test.js:1:1)',
      '    at Module._compile (module.js:1:1)',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should support a “real” error (show a stack)'
  );

  file = vfile({path: 'test.js'});

  try {
    file.fail(changedMessage);
  } catch (err) {}

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'test.js',
      '  1:1  error  ReferenceError: foo',
      '    at Object.<anonymous> (test.js:1:1)',
      '    at Module._compile (module.js:1:1)',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should support a “real” error with a changed message'
  );

  file = vfile({path: 'test.js'});

  try {
    file.fail(multilineException);
  } catch (err) {}

  t.equal(
    chalk.stripColor(reporter(file)),
    [
      'test.js',
      '  1:1  error  ReferenceError: foo',
      'bar',
      'baz',
      '    at Object.<anonymous> (test.js:1:1)',
      '    at Module._compile (module.js:1:1)',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should support a “real” error with a multiline message'
  );

  file = vfile({path: 'a.js'});
  warning = file.message('Whoops');
  warning.note = 'Lorem ipsum dolor sit amet.';
  file.message('...and some more warnings');

  t.equal(
    chalk.stripColor(reporter(file, {verbose: true})),
    [
      'a.js',
      '  1:1  warning  Whoops',
      'Lorem ipsum dolor sit amet.',
      '  1:1  warning  ...and some more warnings',
      '',
      '⚠ 2 warnings'
    ].join('\n'),
    'should support `note` in verbose mode'
  );

  file = vfile({path: 'a.js'});
  file.message('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, vfile({path: 'b.js'})], {quiet: true})),
    [
      'a.js',
      '  1:1  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should ignore successful files in `quiet` mode'
  );

  file = vfile({path: 'a.js'});
  fileB = vfile({path: 'b.js'});

  try {
    file.fail('Error!');
  } catch (err) {}

  fileB.message('Warning!');

  t.equal(
    chalk.stripColor(reporter([file, fileB], {silent: true})),
    [
      'a.js',
      '  1:1  error  Error!',
      '',
      '✖ 1 error'
    ].join('\n'),
    'should ignore non-failures in `silent` mode'
  );

  file = vfile({path: 'a.js'});
  file.stem = 'b';

  t.equal(
    chalk.stripColor(reporter(file)),
    'a.js: no issues found',
    'should support `history`'
  );

  file = vfile({path: 'a.js'});
  file.stored = true;

  t.equal(
    chalk.stripColor(reporter(file)),
    'a.js: written',
    'should support `stored`'
  );

  file = vfile({path: 'a.js'});
  file.stem = 'b';
  file.stored = true;

  t.equal(chalk.stripColor(reporter(file)), 'a.js > b.js: written', 'should expose the stored file-path');

  t.equal(reporter(vfile({path: 'a.js'}), {color: false}), 'a.js: no issues found', 'should support `color: false`');

  file = vfile('Hello this is a file with some issues');
  file.message('Warning!', {
    start: {line: 1, column: 17},
    end: {line: 1, column: 20}
  });

  t.equal(chalk.stripColor(reporter(file, {context: 6})),
    [
      '"... is a file with ..."',
      '  1:17-1:20  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support context'
  );

  file = vfile('Hello this is a file with some issues');
  file.message('Warning!', {
    start: {line: 1, column: 2},
    end: {line: 1, column: 8}
  });

  t.equal(chalk.stripColor(reporter(file, {context: 3})),
    [
      '"...Hello this ..."',
      '  1:2-1:8  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support context near the start of a line'
  );

  file = vfile('Hello this is a file with some issues');
  file.message('Warning!', {
    start: {line: 1, column: 27},
    end: {line: 1, column: 30}
  });

  t.equal(chalk.stripColor(reporter(file, {context: 15})),
    [
      '"...is a file with some issues..."',
      '  1:27-1:30  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support context near the end of a line'
  );

  file = vfile([
    'Hello this is a file with some issues',
    'especially this issue that wraps the line'
  ].join('\n'));
  file.message('Warning!', {
    start: {line: 1, column: 27},
    end: {line: 2, column: 3}
  });

  t.equal(chalk.stripColor(reporter(file, {context: 2})),
    [
      '"...h some issues...espec..."',
      '  1:27-2:3  warning  Warning!',
      '',
      '⚠ 1 warning'
    ].join('\n'),
    'should support context for a message that spans multiple lines'
  );

  t.end();
});

function cleanStack(stack, max) {
  return stack
    .replace(/\(\/.+\//g, '(').replace(/\d+:\d+/g, '1:1')
    .split('\n').slice(0, max).join('\n');
}
