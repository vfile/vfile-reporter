import supportsColor from 'supports-color'
import width from 'string-width'
import repeat from 'repeat-string'
import {stringifyPosition} from 'unist-util-stringify-position'
import {statistics} from 'vfile-statistics'
import {sort} from 'vfile-sort'

var own = {}.hasOwnProperty
var supported = supportsColor.stderr.hasBasic

// `log-symbols` without chalk, ignored for Windows:
/* c8 ignore next 4 */
var chars =
  process.platform === 'win32'
    ? {error: '×', warning: '‼'}
    : {error: '✖', warning: '⚠'}

var labels = {true: 'error', false: 'warning', null: 'info', undefined: 'info'}

// Report a file’s messages.
export function reporter(files, options) {
  var settings = options || {}
  var one

  if (!files) {
    return ''
  }

  // Error.
  if ('name' in files && 'message' in files) {
    return String(files.stack || files)
  }

  // One file.
  if (!('length' in files)) {
    one = true
    files = [files]
  }

  return format(transform(files, settings), one, settings)
}

function transform(files, options) {
  var index = -1
  var rows = []
  var all = []
  var sizes = {}
  var messages
  var offset
  var message
  var messageRows
  var row
  var key

  while (++index < files.length) {
    messages = sort({messages: [...files[index].messages]}).messages
    messageRows = []
    offset = -1

    while (++offset < messages.length) {
      message = messages[offset]

      if (!options.silent || message.fatal) {
        all.push(message)

        row = {
          place: stringifyPosition(
            message.position.end.line && message.position.end.column
              ? message.position
              : message.position.start
          ),
          label: labels[message.fatal],
          reason:
            (message.stack || message.message) +
            (options.verbose && message.note ? '\n' + message.note : ''),
          ruleId: message.ruleId || '',
          source: message.source || ''
        }

        for (key in row) {
          if (own.call(row, key)) {
            sizes[key] = Math.max(size(row[key]), sizes[key] || 0)
          }
        }

        messageRows.push(row)
      }
    }

    if ((!options.quiet && !options.silent) || messageRows.length > 0) {
      rows.push(
        {type: 'file', file: files[index], stats: statistics(messages)},
        ...messageRows
      )
    }
  }

  return {rows, stats: statistics(all), sizes}
}

function format(map, one, options) {
  var enabled =
    options.color === undefined || options.color === null
      ? supported
      : options.color
  var lines = []
  var index = -1
  var stats
  var row
  var line
  var reason
  var rest
  var match

  while (++index < map.rows.length) {
    row = map.rows[index]

    if (row.type === 'file') {
      stats = row.stats
      line = row.file.history[0] || options.defaultName || '<stdin>'

      line =
        one && !options.defaultName && !row.file.history[0]
          ? ''
          : (enabled
              ? '\u001B[4m' /* Underline. */ +
                (stats.fatal
                  ? '\u001B[31m' /* Red. */
                  : stats.total
                  ? '\u001B[33m' /* Yellow. */
                  : '\u001B[32m') /* Green. */ +
                line +
                '\u001B[39m\u001B[24m'
              : line) +
            (row.file.stored && row.file.path !== row.file.history[0]
              ? ' > ' + row.file.path
              : '')

      if (!stats.total) {
        line =
          (line ? line + ': ' : '') +
          (row.file.stored
            ? enabled
              ? '\u001B[33mwritten\u001B[39m' /* Yellow. */
              : 'written'
            : 'no issues found')
      }

      if (line) {
        if (index && map.rows[index - 1].type !== 'file') {
          lines.push('')
        }

        lines.push(line)
      }
    } else {
      reason = row.reason
      match = /\r?\n|\r/.exec(reason)

      if (match) {
        rest = reason.slice(match.index)
        reason = reason.slice(0, match.index)
      } else {
        rest = ''
      }

      lines.push(
        (
          '  ' +
          repeat(' ', map.sizes.place - size(row.place)) +
          row.place +
          '  ' +
          (enabled
            ? (row.label === 'error'
                ? '\u001B[31m' /* Red. */
                : '\u001B[33m') /* Yellow. */ +
              row.label +
              '\u001B[39m'
            : row.label) +
          repeat(' ', map.sizes.label - size(row.label)) +
          '  ' +
          reason +
          repeat(' ', map.sizes.reason - size(reason)) +
          '  ' +
          row.ruleId +
          repeat(' ', map.sizes.ruleId - size(row.ruleId)) +
          '  ' +
          (row.source || '')
        ).replace(/ +$/, '') + rest
      )
    }
  }

  stats = map.stats

  if (stats.fatal || stats.warn) {
    line = ''

    if (stats.fatal) {
      line =
        (enabled
          ? '\u001B[31m' /* Red. */ + chars.error + '\u001B[39m'
          : chars.error) +
        ' ' +
        stats.fatal +
        ' ' +
        (labels.true + (stats.fatal === 1 ? '' : 's'))
    }

    if (stats.warn) {
      line =
        (line ? line + ', ' : '') +
        (enabled
          ? '\u001B[33m' /* Yellow. */ + chars.warning + '\u001B[39m'
          : chars.warning) +
        ' ' +
        stats.warn +
        ' ' +
        (labels.false + (stats.warn === 1 ? '' : 's'))
    }

    if (stats.total !== stats.fatal && stats.total !== stats.warn) {
      line = stats.total + ' messages (' + line + ')'
    }

    lines.push('', line)
  }

  return lines.join('\n')
}

// Get the length of `value`, ignoring ANSI sequences.
function size(value) {
  var match = /\r?\n|\r/.exec(value)
  return width(match ? value.slice(0, match.index) : value)
}
