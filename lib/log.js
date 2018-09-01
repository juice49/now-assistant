const formatDate = require('date-fns/format')

const log = (...entries) => console.log(
  `[${formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}]`,
  ...entries
)

module.exports = log
