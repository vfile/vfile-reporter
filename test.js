'use strict';

/* eslint-env mocha */

/*
 * Dependencies.
 */

var assert = require('assert');
var chalk = require('chalk');
var vfile = require('vfile');
var toVFile = require('to-vfile');
var reporter = require('./index.js');

/*
 * Methods.
 */

var equal = assert.strictEqual;

/**
 * Helper to remove trailing white-space and ANSI-colors.
 *
 * @param {string} value - Value to clean.
 * @return {string} - Cleaned `value`.
 */
function clean(value) {
    return chalk.stripColor(value).trim();
}

/*
 * Fixture of a `real` error.
 */

var exception;

try {
    /* eslint-disable no-undef */
    variable;
} catch (err) {
    err.stack = err.stack
        .replace(/\(\/.+\//g, '(')
        .replace(/\d+:\d+/g, '1:1')
        .split('\n')
        .slice(0, 3)
        .join('\n');

    exception = err;
}

/*
 * Tests.
 */

describe('vfile-reporter', function () {
    it('should return empty when not given files', function () {
        equal(reporter([]), '');
        equal(reporter(), '');
    });

    it('should work on a single file', function () {
        equal(clean(reporter(toVFile('a.js'))), 'a.js: no issues found');
    });

    it('should work without file-paths', function () {
        equal(clean(reporter(vfile())), '<stdin>: no issues found');
    });

    it('should work on files without messages', function () {
        equal(clean(reporter([
            toVFile('a.js'),
            toVFile('b.js'),
            toVFile('c.js')
        ])), [
            'a.js: no issues found',
            'b.js: no issues found',
            'c.js: no issues found'
        ].join('\n'));
    });

    it('should work on files with messages', function () {
        var file = toVFile('a.js');

        file.messages.push(file.message('Note!'));

        equal(clean(reporter([
            file,
            toVFile('b.js'),
            toVFile('c.js')
        ])), [
            'a.js',
            '        1:1  message  Note!',
            '',
            'b.js: no issues found',
            'c.js: no issues found'
        ].join('\n'));
    });

    it('should work on files with warnings', function () {
        var file = toVFile('a.js');

        file.warn('Warning!');

        equal(clean(reporter([
            file,
            toVFile('b.js'),
            toVFile('c.js')
        ])), [
            'a.js',
            '        1:1  warning  Warning!',
            '',
            'b.js: no issues found',
            'c.js: no issues found',
            '',
            '⚠ 1 warning'
        ].join('\n'));
    });

    it('should work on files with errors', function () {
        var file = toVFile('a.js');

        file.quiet = true;

        file.fail('Error!');

        equal(clean(reporter([
            file,
            toVFile('b.js'),
            toVFile('c.js')
        ])), [
            'a.js',
            '        1:1  error    Error!',
            '',
            'b.js: no issues found',
            'c.js: no issues found',
            '',
            '✖ 1 error'
        ].join('\n'));
    });

    it('should work on files with multiple mixed messages', function () {
        var file = toVFile('a.js');

        file.quiet = true;

        file.fail('Error!');
        file.messages.push(file.message('Note!'));
        file.warn('Warning!');
        file.warn('Another warning!');
        file.messages.push(file.message('Another note!'));
        file.fail('Another error!');

        equal(clean(reporter(file)), [
            'a.js',
            '        1:1  error    Error!',
            '        1:1  message  Note!',
            '        1:1  warning  Warning!',
            '        1:1  warning  Another warning!',
            '        1:1  message  Another note!',
            '        1:1  error    Another error!',
            '',
            '6 messages (✖ 2 errors, ⚠ 2 warnings)'
        ].join('\n'));
    });

    it('should support a single position', function () {
        var file = vfile();

        file.warn('Warning!', {
            'line': 3,
            'column': 2
        });

        equal(clean(reporter(file)), [
            '<stdin>',
            '        3:2  warning  Warning!',
            '',
            '⚠ 1 warning'
        ].join('\n'));
    });

    it('should support a location', function () {
        var file = vfile();

        file.warn('Warning!', {
            'start': {
                'line': 3,
                'column': 2
            },
            'end': {
                'line': 4,
                'column': 8
            }
        });

        equal(clean(reporter(file)), [
            '<stdin>',
            '    3:2-4:8  warning  Warning!',
            '',
            '⚠ 1 warning'
        ].join('\n'));
    });

    it('should support a “real” error (show a stack)', function () {
        var file = toVFile('test.js');

        file.quiet = true;
        file.fail(exception);

        equal(clean(reporter(file)), [
            'test.js',
            '        1:1  error    ReferenceError: variable is not defined',
            '    at Object.<anonymous> (test.js:1:1)',
            '    at Module._compile (module.js:1:1)',
            '',
            '✖ 1 error'
        ].join('\n'));
    });

    it('should ignore successful files in `quiet` mode', function () {
        var a = toVFile('a.js');
        var b = toVFile('b.js');
        var c = toVFile('c.js');

        a.quiet = true;

        a.fail('Error!');
        b.warn('Warning!');

        equal(clean(reporter([a, b, c], {
            'quiet': true
        })), [
            'a.js',
            '        1:1  error    Error!',
            '',
            'b.js',
            '        1:1  warning  Warning!',
            '',
            '2 messages (✖ 1 error, ⚠ 1 warning)'
        ].join('\n'));
    });

    it('should ignore non-failures in `silent` mode', function () {
        var a = toVFile('a.js');
        var b = toVFile('b.js');
        var c = toVFile('c.js');

        a.quiet = true;

        a.fail('Error!');
        b.warn('Warning!');

        equal(clean(reporter([a, b, c], {
            'silent': true
        })), [
            'a.js',
            '        1:1  error    Error!',
            '',
            '✖ 1 error'
        ].join('\n'));
    });
});
