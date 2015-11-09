/**

  API Controller for hg:User
  ===
  
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    validator  = require('../validator'),

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
      var form = validator.request(req, {
            email: '',
            password: ''
          }, {
            fields:[
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
            ]
          });

      if(!form.isValid)
        return helpers.formError(form.errors, res);

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
      user = _.assign({
        username: form.params.username,
        password: form.params.password,
        email: form.params.email,
        first_name: form.params.first_name,
        last_name:  form.params.last_name,
        about: form.params.username

      }, {
        strategy   : 'local',
        password   : encrypted.key,
        salt       : encrypted.salt,
        status     : 'disabled',
        activation : activation.key   
      });
      
      neo4j.save(user, 'user', function (err, node) {
        // console.log(_.keys(err.neo4jError), _.keys(err), _.keys(err.neo4jError.errors))
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          item: {
            username: form.params.username  
          } 
        });
      });
    }],
    /*
      GET:/activate the user, directly from the activation link.
      Send an activation link by email.
    */
    activate: [multer(), function (req, res) {
      var form = validator.request(req, {
            email: '',
            k:''
          }, {
            fields:[
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
            ]
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      console.log(form)
      neo4j.query('MATCH(n:user {email:{email}, activation:{key}}) SET n.status={status} RETURN n', {
        email: form.params.email,
        key: form.params.k,
        status: 'enabled'
      }, function(err, items) {
        if(err)
          return res.error(400, {message: 'bad request'});
        return res.ok();
      });
    }],


    pulse: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0
          });
      User.pulse(req.user, form.params, function (err, items, info) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({items: items}, info);
      });
    },
    /*
      Return a list of last user-touched resources.

    */
    getRelatedResources: function(req, res) {
      var form = validator.request(req, {
            limit: 10,
            offset: 0,
            id: req.user.id // default the single user
          });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      console.log(form)
      User.getRelatedResources({
        id: form.params.id
      }, form.params, function (err, items, info) {
        helpers.models.getMany(err, res, items, info, form.params);
      });
    },

    /*
      Get bipartite graph of user most loved resource network
    */
    getRelatedResourcesGraph: function (req, res) {
      var form = validator.request(req, {
            id: req.user.id // default the single user
          });
       if(!form.isValid)
        return helpers.formError(form.errors, res);
      
      User.getRelatedResourcesGraph({
        id: form.params.id
      },
      _.assign({}, form.params,{
        limit: 500
      }), function (err, graph) {
        if(err)
          return helpers.cypherQueryError(err, res);
        return res.ok({
          graph: graph
        }, _.assign({
          type: 'monopartite'
        }, form.params));
      });
    },
  }
};