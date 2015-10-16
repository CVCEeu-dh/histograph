/**

  API Controller for hg:User
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    validator  = require('validator'),
    _validator  = require('../validator'),
    multer     = require('multer'),
    _          = require('lodash'),
    neo4j      = require('seraph')(settings.neo4j.host),
    
    User       = require('../models/user'),

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

// do try catch
var validate = function(form, fields) {
  var errors = [];
  for(i in fields)
    if(!validator[fields[i].check].apply(this, [form[fields[i].field]].concat(fields[i].args)))
      errors.push(fields[i]);
  if(errors.length)
    return errors;
  return true;
};


module.exports = function(io) {
  return {
    // set user fav language. the resources will be 
    setLanguage: function (req, res) {
      return res.json({
        user: req.session
      });
    },
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
      var activation,
          encrypted,
          user;
      // check if form is valid
      var result = validate(req.body, fields);
      if(result !== true)
        return res.error(400, {form: result})

      // generate a key and activation code
      encrypted = helpers.encrypt(req.body.password, {
        from: 'signup.encrypted',
        secret: settings.secret.salt
      });

      activation = helpers.encrypt(req.body.email, {
        from: 'signup.activation',
        secret: settings.secret.activation, 
        iterations: 23,
        length: 128,
        digest: 'sha1'
      });

      // enrich user with password and activation code
      user = _.assign(req.body, {
        password   : encrypted.key,
        salt       : encrypted.salt,
        status     : 'disabled',
        activation : activation.key   
      });
      
      neo4j.save(user, 'user', function (err, node) {
        // console.log(_.keys(err.neo4jError), _.keys(err), _.keys(err.neo4jError.errors))
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok();
      });
    }],
    /*
      GET:/activate the user, directly from the activation link.
      Send an activation link by email.
    */
    activate: [multer(), function (req, res) {
      var result = validate(req.query, [
        {
          field: 'email',
          check: 'isEmail',
          error: 'it is not a real email'
        },
        {
          field: 'k',
          check: 'isLength',
          args: [
            8,
          ],
          error: 'please provide the k. Otherwise, contact the system administator'
        }
      ]);

      if(result !== true)
        return res.error(400, {form: result});

      neo4j.query('MATCH(n:user {email:{email}, activation:{key}}) SET n.status={status} RETURN n', {
        email: req.query.email,
        key: req.query.k,
        status: 'enabled'
      }, function(err, items) {
        if(err)
          return res.error(400, {message: 'bad request'});
        return res.ok();
      })

      
    }],


    pulse: function(req, res) {
      var form = _validator.request(req, {
            limit: 10,
            offset: 0
          });
      User.pulse(req.user, form.params, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({items: items}, info);
      });
    }
  }
};