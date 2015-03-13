module.exports = {
  /**
    Handle causes and stacktraces provided by seraph
    @err the err string provided by cypher
    @res the express response object
  */
  cypherError: function(err, res) {
    if(err && err.message) {
        var result = JSON.parse(err.message);

        if(result.cause)
          return res.error(400, result.cause);

        return res.error(500, result);
    }
    return res.error(400, err.message);
  }
}
      