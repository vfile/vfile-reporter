'use strict';

var plural = require('plur');
var width = require('string-width');
var symbols = require('log-symbols');
var stringify = require('unist-util-stringify-position');
var Chalk = require('chalk').constructor;
var strip = require('strip-ansi');
var repeat = require('repeat-string');
var trim = require('trim');
var statistics = require('vfile-statistics');

module.exports = reporter;

/* Default filename. */
var DEFAULT = '<stdin>';

/* Report a file’s messages. */
function reporter(files, options) {
  var settings = options || {};
  var one;

  if (!files) {
    return '';
  }

  /* Error. */
  if ('name' in files && 'message' in files) {
    return String(files.stack || files);
  }

  /* One file. */
  if (!('length' in files)) {
    one = true;
    files = [files];
  }

  return compile(parse(filter(files, settings), settings), one, settings);
}

function filter(files, options) {
  var result = [];
  var length = files.length;
  var index = -1;
  var file;

  if (!options.quiet && !options.silent) {
    return files.concat();
  }

  while (++index < length) {
    file = files[index];

    if (applicable(file, options).length !== 0) {
      result.push(file);
    }
  }

  return result;
}

function parse(files, options) {
  var length = files.length;
  var index = -1;
  var rows = [];
  var all = [];
  var locationSize = 0;
  var labelSize = 0;
  var reasonSize = 0;
  var ruleIdSize = 0;
  var file;
  var destination;
  var origin;
  var messages;
  var offset;
  var count;
  var message;
  var loc;
  var reason;
  var label;
  var id;

  while (++index < length) {
    file = files[index];
    destination = current(file);
    origin = file.history[0] || destination;
    messages = applicable(file, options).sort(comparator);

    if (rows.length !== 0 && rows[rows.length - 1].type !== 'header') {
      rows.push({type: 'separator'});
    }

    rows.push({
      type: 'header',
      origin: origin,
      destination: destination,
      name: origin || options.defaultName || DEFAULT,
      stored: Boolean(file.stored),
      moved: Boolean(file.stored && destination !== origin),
      stats: statistics(messages)
    });

    offset = -1;
    count = messages.length;

    while (++offset < count) {
      message = messages[offset];
      id = message.ruleId || '';
      reason = message.stack || message.message;
      loc = message.location;
      loc = stringify(loc.end.line && loc.end.column ? loc : loc.start);

      if (options.verbose && message.note) {
        reason += '\n' + message.note;
      }

      label = message.fatal ? 'error' : 'warning';

      if (options.context) {
        var lines = String(file).split('\n');
        var line = lines[message.location.start.line - 1];
        var startIndex = message.location.start.column - 1 - options.context;
        var endIndex = message.location.end.column + options.context;
        var contextStart = startIndex > 0 ? startIndex : 0;
        var contextEnd = endIndex < line.length ? endIndex : line.length;
        var context;
        if (message.location.start.line < message.location.end.line) {
          var endLine = lines[message.location.end.line - 1];
          context = line.slice(contextStart, line.length) + '...' + endLine.slice(0, contextEnd);
        } else {
          context = line.slice(contextStart, contextEnd);
        }
        rows.push({
          type: 'context',
          context: context
        });
      }

      rows.push({
        location: loc,
        label: label,
        reason: reason,
        ruleId: id,
        source: message.source
      });

      locationSize = Math.max(realLength(loc), locationSize);
      labelSize = Math.max(realLength(label), labelSize);
      reasonSize = Math.max(realLength(reason), reasonSize);
      ruleIdSize = Math.max(realLength(id), ruleIdSize);
    }

    all = all.concat(messages);
  }

  return {
    rows: rows,
    statistics: statistics(all),
    location: locationSize,
    label: labelSize,
    reason: reasonSize,
    ruleId: ruleIdSize
  };
}

function compile(map, one, options) {
  var chalk = new Chalk({enabled: options.color});
  var all = map.statistics;
  var rows = map.rows;
  var length = rows.length;
  var index = -1;
  var lines = [];
  var row;
  var line;

  while (++index < length) {
    row = rows[index];

    if (row.type === 'separator') {
      lines.push('');
    } else if (row.type === 'header') {
      line = chalk.underline[colors(row.stats)](row.name) +
        (row.moved ? ' > ' + row.destination : '');

      if (one && !options.defaultName && !row.origin) {
        line = '';
      }

      if (!row.stats.total) {
        line += line ? ': ' : '';
        line += row.stored ? chalk.yellow('written') : 'no issues found';
      }

      if (line) {
        lines.push(line);
      }
    } else if (row.type === 'context') {
      lines.push('"...' + row.context + '..."');
    } else {
      lines.push(trim.right([
        '',
        padLeft(row.location, map.location),
        padRight(chalk[color(row.label)](row.label), map.label),
        padRight(row.reason, map.reason),
        padRight(row.ruleId, map.ruleId),
        row.source || ''
      ].join('  ')));
    }
  }

  if (all.total) {
    line = [];

    if (all.fatal) {
      line.push([
        chalk.red(strip(symbols.error)),
        all.fatal,
        plural('error', all.fatal)
      ].join(' '));
    }

    if (all.nonfatal) {
      line.push([
        chalk.yellow(strip(symbols.warning)),
        all.nonfatal,
        plural('warning', all.nonfatal)
      ].join(' '));
    }

    line = line.join(', ');

    if (all.fatal && all.nonfatal) {
      line = all.total + ' messages (' + line + ')';
    }

    lines.push('', line);
  }

  return lines.join('\n');
}

function applicable(file, options) {
  var messages = file.messages;
  var length = messages.length;
  var index = -1;
  var result = [];

  if (options.silent) {
    while (++index < length) {
      if (messages[index].fatal) {
        result.push(messages[index]);
      }
    }
  } else {
    result = messages.concat();
  }

  return result;
}

/* Get colors for stats. */
function colors(stats) {
  if (stats.fatal) {
    return 'red';
  }

  return stats.total ? 'yellow' : 'green';
}

/* Get color of a label. */
function color(label) {
  return label === 'error' ? 'red' : 'yellow';
}

/* Get the length of `value`, ignoring ANSI sequences. */
function realLength(value) {
  var length = value.indexOf('\n');
  return width(length === -1 ? value : value.slice(0, length));
}

/* Pad `value` on the left. */
function padLeft(value, minimum) {
  return repeat(' ', minimum - realLength(value)) + value;
}

/* Pad `value` on the Right. */
function padRight(value, minimum) {
  return value + repeat(' ', minimum - realLength(value));
}

/* Comparator. */
function comparator(a, b) {
  return check(a, b, 'line') || check(a, b, 'column') || -1;
}

/* Compare a single property. */
function check(a, b, property) {
  return (a[property] || 0) - (b[property] || 0);
}

function current(file) {
  /* istanbul ignore if - Previous `vfile` version. */
  if (file.filePath) {
    return file.filePath();
  }

  return file.path;
}
