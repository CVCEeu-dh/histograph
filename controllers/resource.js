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
      item.locations = _.values(item.locations);
      item.persons = _.values(item.persons);
      item.comments = _.values(item.comments);

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
      return res.ok({
        items: items
      });
    })
  },

 
}