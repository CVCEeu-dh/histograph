/**

  API Controller for hg:User
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    validator  = require('validator'),
    multer     = require('multer'),
    crypto     = require('crypto'),
    _          = require('lodash'),
    neo4j      = require('seraph')(settings.neo4j.host),

    fields     = [
      {
        field: 'email',
        check: 'isEmail',
        error: 'it is not a real email'
      },
      {
        field: 'password',
        check: 'isLength',
        args: [
          8,
          32
        ],
        error: 'password have to ...'
      }
    ];


var validate = function(user, fields) {
  var errors = [];
  for(i in fields)
    if(!validator[fields[i].check].apply(this, [user[fields[i].field]].concat(fields[i].args)))
      errors.push(fields[i]);
  if(errors.length)
    return errors;
  return true;
};


module.exports = {
  /*
    give some information about current session
  */
  session: function (req, res) {
    return res.json({
      user: req.session
    });
  },

  /*
    get some user, if current user is authenticated of cours
  */
  

  /*
    create an user with a cryptic password, and random salt.
    Send an activation link by email.
  */
  signup: [multer(), function (req, res) {
    var salt = crypto.randomBytes(16).toString('hex'),
        activation,
        encrypted,
        user;
    // check if form is valid
    var result = validate(req.body, fields);
    if(result !== true)
      return res.error(400, {form: result})

    // generate a key and activation code
    encrypted = crypto.pbkdf2Sync(settings.secret.salt, salt, 4096, 256, 'sha256').toString('hex');
    activation = crypto.pbkdf2Sync(settings.secret.activation, req.body.email, 23, 128, 'sha1').toString('hex');

    // enrich user with password and activation code
    user = _.assign(req.body, {
      password   : encrypted,
      salt       : salt,
      status     : 'disabled',
      activation : activation       
    });
    
    neo4j.save(user, 'user', function (err, node) {
      if(err)
        return helpers.cypherError(err, res);
      return res.ok();
    });
  }],

  activate: [multer(), function (req, res) {
    return res.ok();
  }]



}