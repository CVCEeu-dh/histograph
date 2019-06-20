const resources = require('./resources')
const users = require('./users')

module.exports = router => {
  router.use('/resources', resources)
  router.use('/users', users)
  return router
}
