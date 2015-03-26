/**

  API Controller for hg:Resource
  ===
  
*/
var settings   = require('../settings'),
    queries    = require('decypher')('./queries/resource.cyp'),
    helpers    = require('../helpers'),
    YAML       = require('yamljs'),

    _          = require('lodash'),

    neo4j      = require('seraph')(settings.neo4j.host);
    

module.exports = {
  /*
    get a single resources, along with comments and inquiries (with relationships).
  */
  getItem: function (req, res) {
    neo4j.query(queries.get_resource, {
      id: +req.params.id
    }, function(err, items) {
      if(err)
        return helpers.cypherQueryError(err, res);
      
      var item = items[0].resource;
      //console.log(item)
      item.versions = _.values(item.versions);
      item.locations = _.values(item.locations).map(function (d) {
        if(d.yaml)
          d.yaml = YAML.parse(d.yaml);
        return d;
      });
      item.persons = _.values(item.persons);
      item.comments = _.values(item.comments);
      item.version = _.find(item.versions, {first: true}); // the original one;
      
     
      return res.ok({
        item: item
      });
    })
  },
  /*
    get some, based on the limit/offset settings
  */
  getItems: function (req, res) {
    neo4j.query(queries.get_resources, {
      limit: 20,
      offset: 0
    }, function(err, items) {
      if(err)
        return helpers.cypherQueryError(err, res);
      
      return res.ok({
        items: items
      });
    })
  },

  /*
    create a comment on this resource
  */
  createComment: function(req, res) {
    console.log('ici', req.body.content, req.user);
    var now = helpers.now();

    // add dummy comments on it.
    neo4j.query(queries.add_comment_to_resource, {
      id: +req.body.resource_id,
      content: req.body.content,
      tags: req.body.tags,
      username: req.user.username,
      creation_date: now.date,
      creation_time: now.time
    }, function (err, items) {
      console.log(err, items);
      if(err)
        return helpers.cypherQueryError(err, res);
      
      return res.ok({
      
      });
    })

    
  }
}