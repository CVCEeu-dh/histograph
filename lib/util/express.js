
function asyncHandler(f, callNext = true) {
  return (req, res, next) => Promise.resolve(f(req, res, next))
    .then(() => { if (callNext) { next() } })
    .catch(next)
}


module.exports = {
  asyncHandler
}
