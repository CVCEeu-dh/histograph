const { isString, isError, isNil } = require('lodash')

function enableLoglevelPrefix(log, squishLogs) {
  if (log._prefixSetUp) return log

  // eslint-disable-next-line no-param-reassign
  log._squishLogs = squishLogs || process.env.SQUISH_LOGS === '1'

  const originalFactory = log.methodFactory
  // eslint-disable-next-line no-param-reassign
  log.methodFactory = (methodName, logLevel, loggerName) => {
    const rawMethod = originalFactory(methodName, logLevel, loggerName)
    return (message, ...args) => {
      let actualMessage = message
      let actualArgs = args
      if (log._squishLogs) {
        actualArgs = args.map(a => {
          if (isError(a)) return a.stack.replace(/\n/g, '\\n')
          if (isString(a)) return a.replace(/\n/g, '\\n')
          if (isNil(a)) return ''
          try {
            return JSON.stringify(a)
          } catch (e) {
            return a.toString()
          }
        })
        actualMessage = message.replace(/\n/g, '\\n')
      }
      return rawMethod(`${(new Date()).toISOString()} [${methodName}] ${actualMessage}`, ...actualArgs)
    }
  }
  // eslint-disable-next-line no-param-reassign
  log._prefixSetUp = true
  return log
}

function getLogger(squishLogs) {
  // eslint-disable-next-line global-require
  let log = require('loglevel')
  log = enableLoglevelPrefix(log, squishLogs)
  log.setLevel(process.env.LOG_LEVEL || 'trace')
  return log
}

module.exports = { enableLoglevelPrefix, getLogger }
