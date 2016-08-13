// Dependencies:
var vfile = require('vfile');
var reporter = require('./index.js');

// Files:
var one = vfile({path: 'test/fixture/1.js'});
var two = vfile({path: 'test/fixture/2.js'});

// Trigger a warning:
one.message('Warning!', {line: 2, column: 4});

// Report:
var report = reporter([one, two], {color: false});

// Yields:
console.log('txt', report);
