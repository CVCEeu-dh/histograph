/**
  A bunch of useful functions
*/
var crypto = require('crypto'),
    _      = require('lodash');

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
  },
  /**
    encrypt a password ccording to local settings secret and a random salt.
  */
  encrypt: function(password, options) {
    var configs = _.assign({
          secret: '',
          salt: crypto.randomBytes(16).toString('hex'),
          iterations: 4096,
          length: 256,
          digest: 'sha256'
        }, options || {});
    //console.log(configs)
    return {
      salt: configs.salt,
      key: crypto.pbkdf2Sync(
        configs.secret,
        configs.salt + '::' + password,
        configs.iterations,
        configs.length,
        configs.digest
      ).toString('hex')
    };
  },

  comparePassword:  function(password, encrypted, options) {
    return this.encrypt(password, options).key == encrypted;
  }
}
      