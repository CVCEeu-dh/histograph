const resources = require('./resources')
const users = require('./users')
const pipelines = require('./pipelines')

module.exports = router => {
  router.use('/resources', resources)
  router.use('/users', users)
  router.use('/pipelines', pipelines)
  return router
}
