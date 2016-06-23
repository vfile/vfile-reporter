// Dependencies:
var toVFile = require('to-vfile');
var reporter = require('./index.js');

// Files:
var one = toVFile('test/fixture/1.js');
var two = toVFile('test/fixture/2.js');

// Trigger a warning:
one.warn('Warning!', {line: 2, column: 4});

// Report:
var report = reporter([one, two], {color: false});

// Yields:
console.log('txt', report);
