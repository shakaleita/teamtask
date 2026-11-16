'use strict';
/** RFC 4180 CSV encoding with spreadsheet formula-injection mitigation. */
function cell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@\t\r]/u.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function serialize(rows, columns) {
  if (!Array.isArray(rows) || !Array.isArray(columns) || !columns.length)
    throw new TypeError('Rows and nonempty columns are required');
  return [columns.map(cell).join(','), ...rows.map(row =>
    columns.map(column => cell(row[column])).join(',')
  )].join('\r\n') + '\r\n';
}
module.exports = {cell, serialize};
