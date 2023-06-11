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
 * @typedef State
 *   Info passed around.
 * @property {boolean} colorEnabled
 *   Whether color is enabled; can be turned on explicitly or implicitly in
 *   Node.js based on whether stderr supports color.
 * @property {boolean} oneFileMode
 *   Whether explicitly a single file is passed.
 * @property {boolean} verbose
 *   Whether notes should be shown.
 * @property {boolean} quiet
 *   Whether to hide files without messages.
 * @property {boolean} silent
 *   Whether to hide warnings and info messages.
 * @property {string | undefined} defaultName
 *   Default name to use.
 */

import stringWidth from 'string-width'
import {stringifyPosition} from 'unist-util-stringify-position'
import {compareFile, compareMessage} from 'vfile-sort'
import {statistics} from 'vfile-statistics'
import {color} from './color.js'

const eol = /\r?\n|\r/

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

  const settings = options || {}
  let oneFileMode = false

  if (Array.isArray(files)) {
    // Empty.
  } else {
    oneFileMode = true
    files = [files]
  }

  return serializeRows(
    createRows(
      {
        colorEnabled:
          typeof settings.color === 'boolean' ? settings.color : color,
        defaultName: settings.defaultName || undefined,
        oneFileMode,
        quiet: settings.quiet || false,
        silent: settings.silent || false,
        verbose: settings.verbose || false
      },
      files
    )
  )
}

/**
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<Array<VFile>>} files
 *   Files.
 * @returns {Array<Array<string> | string>}
 *   Rows.
 */
function createRows(state, files) {
  // To do: when Node 18 is EOL, use `toSorted`.
  const sortedFiles = [...files].sort(compareFile)
  /** @type {Array<VFileMessage>} */
  const all = []
  let index = -1
  /** @type {Array<Array<string> | string>} */
  const rows = []
  let lastWasMessage = false

  while (++index < sortedFiles.length) {
    const file = sortedFiles[index]
    // To do: when Node 18 is EOL, use `toSorted`.
    const messages = [...file.messages].sort(compareMessage)
    /** @type {Array<Array<string> | string>} */
    const messageRows = []
    let offset = -1

    while (++offset < messages.length) {
      const message = messages[offset]

      if (!state.silent || message.fatal) {
        all.push(message)
        messageRows.push(...createMessageLine(state, message))
      }
    }

    if ((!state.quiet && !state.silent) || messageRows.length > 0) {
      const line = createFileLine(state, file)

      // EOL between message and a file header.
      if (lastWasMessage && line) rows.push('')
      if (line) rows.push(line)
      if (messageRows.length > 0) rows.push(...messageRows)

      lastWasMessage = messageRows.length > 0
    }
  }

  const stats = statistics(all)

  if (stats.fatal || stats.warn) {
    rows.push('', createByline(state, stats))
  }

  return rows
}

/**
 * @param {Readonly<Array<Readonly<Array<string>> | string>>} rows
 *   Rows.
 * @returns {string}
 *   Report.
 */
function serializeRows(rows) {
  /** @type {Array<number>} */
  const sizes = []
  let index = -1

  // Calculate sizes.
  while (++index < rows.length) {
    const row = rows[index]

    if (typeof row === 'string') {
      // Continue.
    } else {
      let cellIndex = -1
      while (++cellIndex < row.length) {
        const current = sizes[cellIndex] || 0
        const size = stringWidth(row[cellIndex])
        if (size > current) {
          sizes[cellIndex] = size
        }
      }
    }
  }

  /** @type {Array<string>} */
  const lines = []
  index = -1

  while (++index < rows.length) {
    const row = rows[index]
    let line = ''

    if (typeof row === 'string') {
      line = row
    } else {
      let cellIndex = -1

      while (++cellIndex < row.length) {
        const cell = row[cellIndex] || ''
        const max = (sizes[cellIndex] || 0) + 2
        line += cell + ' '.repeat(max - stringWidth(cell))
      }
    }

    lines.push(line.trimEnd())
  }

  return lines.join('\n')
}

/**
 * Show a problem.
 *
 * @param {Readonly<State>} state
 *   Info passed around.
 * @param {Readonly<VFileMessage>} message
 *   Message.
 * @returns {Array<Array<string> | string>}
 *   Line.
 */
function createMessageLine(state, message) {
  const label = createLabel(message.fatal)
  let reason =
    (message.stack || message.message) +
    (state.verbose && message.note ? '\n' + message.note : '')

  const match = eol.exec(reason)
  /** @type {Array<string>} */
  let rest = []

  if (match) {
    rest = reason.slice(match.index + 1).split(eol)
    reason = reason.slice(0, match.index)
  }

  const row = [
    '',
    stringifyPosition(message.place),
    state.colorEnabled
      ? (label === 'error'
          ? '\u001B[31m' /* Red. */
          : '\u001B[33m') /* Yellow. */ +
        label +
        '\u001B[39m'
      : label,
    reason,
    message.ruleId || '',
    message.source || ''
  ]

  return [row, ...rest]
}

/**
 * Create a summary of problems for a file.
 *
 * @param {Readonly<State>} state
 *   Info passed around.
 * @param {Readonly<VFile>} file
 *   File.
 * @returns {string}
 *   Line.
 */
function createFileLine(state, file) {
  const stats = statistics(file.messages)
  const fromPath = file.history[0]
  const toPath = file.path
  let left = ''
  let right = ''

  if (!state.oneFileMode || state.defaultName || fromPath) {
    const name = fromPath || state.defaultName || '<stdin>'

    left =
      (state.colorEnabled
        ? '\u001B[4m' /* Underline. */ +
          (stats.fatal
            ? '\u001B[31m' /* Red. */
            : stats.total
            ? '\u001B[33m' /* Yellow. */
            : '\u001B[32m') /* Green. */ +
          name +
          '\u001B[39m\u001B[24m'
        : name) + (file.stored && name !== toPath ? ' > ' + toPath : '')
  }

  // To do: always expose `written` if stored?
  if (!stats.total) {
    right += file.stored
      ? state.colorEnabled
        ? '\u001B[33mwritten\u001B[39m' /* Yellow. */
        : 'written'
      : 'no issues found'
  }

  return left && right ? left + ': ' + right : left + right
}

/**
 * Create a summary of total problems.
 *
 * @param {Readonly<State>} state
 *   Info passed around.
 * @param {Readonly<Statistics>} stats
 *   Statistics.
 * @returns {string}
 *   Line.
 */
function createByline(state, stats) {
  let result = ''

  if (stats.fatal) {
    result =
      (state.colorEnabled ? /* Red. */ '\u001B[31m✖\u001B[39m' : '✖') +
      ' ' +
      stats.fatal +
      ' ' +
      (createLabel(true) + (stats.fatal === 1 ? '' : 's'))
  }

  if (stats.warn) {
    result =
      (result ? result + ', ' : '') +
      (state.colorEnabled ? /* Yellow. */ '\u001B[33m⚠\u001B[39m' : '⚠') +
      ' ' +
      stats.warn +
      ' ' +
      (createLabel(false) + (stats.warn === 1 ? '' : 's'))
  }

  if (stats.total !== stats.fatal && stats.total !== stats.warn) {
    result = stats.total + ' messages (' + result + ')'
  }

  return result
}

/**
 * Serialize `fatal` as a label.
 *
 * @param {boolean | null | undefined} value
 *   Fatal.
 * @returns {string}
 *   Label.
 */
function createLabel(value) {
  return value ? 'error' : value === false ? 'warning' : 'info'
}
