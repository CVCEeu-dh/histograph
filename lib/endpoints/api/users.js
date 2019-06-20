const express = require('express')
const { asyncHandler } = require('../../util/express')

const router = express.Router()

/**
 * Return details of currently logged in user.
 */
router.get('/self', asyncHandler(async (req, res) => {
  res.json({ user: req.user })
}))

module.exports = router
