/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('vfile-message').VFileMessage} VFileMessage
 * @typedef {import('vfile-statistics').Statistics} Statistics
 */

/**
 * @typedef Options
 *   Configuration (optional).
 * @property {boolean | null | undefined} [color]
 *   Use ANSI colors in report (default: `true` when in Node.js and
 *   [color is supported][supports-color], or `false`).
 *
 *   [supports-color]: https://github.com/chalk/supports-color
 * @property {boolean | null | undefined} [verbose=false]
 *   Show message [`note`][message-note]s (default: `false`); notes are
 *   optional, additional, long descriptions.
 *
 *   [message-note]: https://github.com/vfile/vfile-message#note
 * @property {boolean | null | undefined} [quiet=false]
 *   Do not show files without messages (default: `false`).
 * @property {boolean | null | undefined} [silent=false]
 *   Show errors only (default: `false`); this hides info and warning messages,
 *   and sets `quiet: true`.
 * @property {string | null | undefined} [defaultName='<stdin>']
 *   Label to use for files without file path (default: `'<stdin>'`); if one
 *   file and no `defaultName` is given, no name will show up in the report.
 */

/**
 * @typedef MessageRow
 *   Message.
 * @property {string} place
 *   Serialized positional info.
 * @property {string} label
 *   Kind of message.
 * @property {string} reason
 *   Reason.
 * @property {string} ruleId
 *   Rule.
 * @property {string} source
 *   Source.
 *
 * @typedef {keyof MessageRow} MessageColumn
 *
 * @typedef FileRow
 *   File header row.
 * @property {'file'} type
 *   Kind.
 * @property {VFile} file
 *   Virtual file.
 * @property {Statistics} stats
 *   Statistics.
 *
 * @typedef {Record<MessageColumn, number>} Sizes
 *   Sizes for message columns.
 *
 * @typedef Info
 *   Result.
 * @property {Array<FileRow | MessageRow>} rows
 *   Rows.
 * @property {Statistics} stats
 *   Total statistics.
 * @property {Sizes} sizes
 *   Sizes for message columns.
 */

import stringWidth from 'string-width'
import {stringifyPosition} from 'unist-util-stringify-position'
import {sort} from 'vfile-sort'
import {statistics} from 'vfile-statistics'
import {color} from './color.js'

const own = {}.hasOwnProperty

const labels = {
  true: 'error',
  false: 'warning',
  null: 'info',
  undefined: 'info'
}

/**
 * Create a report from one or more files.
 *
 * @param {Array<VFile> | VFile} files
 *   Files or error to report.
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {string}
 *   Report.
 */
export function reporter(files, options) {
  const settings = options || {}
  let one = false

  if (
    // Nothing.
    !files ||
    // Error.
    ('name' in files && 'message' in files)
  ) {
    throw new TypeError(
      'Unexpected value for `files`, expected one or more `VFile`s'
    )
  }

  if (Array.isArray(files)) {
    // Empty.
  } else {
    one = true
    files = [files]
  }

  return format(transform(files, settings), one, settings)
}

/**
 * Parse a list of messages.
 *
 * @param {Array<VFile>} files
 *   List of files.
 * @param {Options} options
 *   Options.
 * @returns {Info}
 *   Rows.
 */
function transform(files, options) {
  /** @type {Array<FileRow | MessageRow>} */
  const rows = []
  /** @type {Array<VFileMessage>} */
  const all = []
  /** @type {Sizes} */
  const sizes = {place: 0, label: 0, reason: 0, ruleId: 0, source: 0}
  let index = -1

  while (++index < files.length) {
    // @ts-expect-error it works fine.
    const messages = sort({messages: [...files[index].messages]}).messages
    /** @type {Array<MessageRow>} */
    const messageRows = []
    let offset = -1

    while (++offset < messages.length) {
      const message = messages[offset]

      if (!options.silent || message.fatal) {
        all.push(message)

        const row = {
          place: stringifyPosition(
            message.position
              ? message.position.end.line && message.position.end.column
                ? message.position
                : message.position.start
              : undefined
          ),
          label: labels[/** @type {keyof labels} */ (String(message.fatal))],
          reason:
            (message.stack || message.message) +
            (options.verbose && message.note ? '\n' + message.note : ''),
          ruleId: message.ruleId || '',
          source: message.source || ''
        }

        /** @type {MessageColumn} */
        let key

        for (key in row) {
          // eslint-disable-next-line max-depth
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

/**
 * @param {Info} map
 *   Rows.
 * @param {boolean} one
 *   Whether the input was explicitly one file (not an array).
 * @param {Options} options
 *   Configuration.
 * @returns {string}
 *   Report.
 */
// eslint-disable-next-line complexity
function format(map, one, options) {
  const enabled =
    options.color === undefined || options.color === null
      ? color
      : options.color
  /** @type {Array<string>} */
  const lines = []
  let index = -1

  while (++index < map.rows.length) {
    const row = map.rows[index]

    if ('type' in row) {
      const stats = row.stats
      let line = row.file.history[0] || options.defaultName || '<stdin>'

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
        if (index && !('type' in map.rows[index - 1])) {
          lines.push('')
        }

        lines.push(line)
      }
    } else {
      let reason = row.reason
      const match = /\r?\n|\r/.exec(reason)
      /** @type {string} */
      let rest

      if (match) {
        rest = reason.slice(match.index)
        reason = reason.slice(0, match.index)
      } else {
        rest = ''
      }

      lines.push(
        (
          '  ' +
          ' '.repeat(map.sizes.place - size(row.place)) +
          row.place +
          '  ' +
          (enabled
            ? (row.label === 'error'
                ? '\u001B[31m' /* Red. */
                : '\u001B[33m') /* Yellow. */ +
              row.label +
              '\u001B[39m'
            : row.label) +
          ' '.repeat(map.sizes.label - size(row.label)) +
          '  ' +
          reason +
          ' '.repeat(map.sizes.reason - size(reason)) +
          '  ' +
          row.ruleId +
          ' '.repeat(map.sizes.ruleId - size(row.ruleId)) +
          '  ' +
          (row.source || '')
        ).replace(/ +$/, '') + rest
      )
    }
  }

  const stats = map.stats

  if (stats.fatal || stats.warn) {
    let line = ''

    if (stats.fatal) {
      line =
        (enabled ? /* Red. */ '\u001B[31m✖\u001B[39m' : '✖') +
        ' ' +
        stats.fatal +
        ' ' +
        (labels.true + (stats.fatal === 1 ? '' : 's'))
    }

    if (stats.warn) {
      line =
        (line ? line + ', ' : '') +
        (enabled ? /* Yellow. */ '\u001B[33m⚠\u001B[39m' : '⚠') +
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

/**
 * Get the length of the first line of `value`, ignoring ANSI sequences.
 *
 * @param {string} value
 *   Message.
 * @returns {number}
 *   Width.
 */
function size(value) {
  const match = /\r?\n|\r/.exec(value)
  return stringWidth(match ? value.slice(0, match.index) : value)
}
