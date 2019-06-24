/**
 * Comment Model
 * =============
 * 
 * Normally, (c:comment:observation)-[r:answers]->(i:inquiry)-[r:questions]->(n:resource)
 * and
 * Tests are done in their specific parent model file.
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    parser    = require('../parser.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/comment.cyp'),

    async     = require('async'),
    _         = require('lodash');
    

module.exports = {
  getMany: function(properties, next) {
    var query = parser.agentBrown(queries.get_comments, properties);
    neo4j.query(query, properties, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      next(null, nodes);
    })
  },
  /*
    Useful api for downvoting/upvoting or modif
    Note that You can modify the original one only if you're the owner of the comment.
  */
  update: function(id, properties, next) {
    var now = helpers.now();
        // query = parser.agentBrown(queries.update_comment, properties);
    
    neo4j.query(queries.get_comment, {
      id: id
    }, function (err, com) {
      if(err) {
        next(err);
        return;
      }
      if(!com.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      com = com[0];
       // -> { make: 'Citroen', model: 'DS4', id: 1 }
      if(properties.upvoted_by) {
        com.props.upvote = _.uniq((com.props.upvote || []).concat(properties.upvoted_by));
      }
      if(properties.downvoted_by) {
        com.props.downvote = _.uniq((com.props.downvote || []).concat(properties.downvoted_by));
      }
      com.props.celebrity =  _.uniq((com.props.upvote || []).concat(com.props.downvote|| [])).length;
      com.props.score = (com.props.upvote || []).length - (com.props.downvote|| []).length;
      com.props.last_modification_date = now.date;
      com.props.last_modification_time = now.time;
      // user will follow the inquiry
      // upvote downvote with user username. (more readable)
      // score is changed relatively
      neo4j.save(com.props, function (err, props) {
        if(err) {
          next(err);
          return;
        }
        com.props = props;
        next(null, com);
      })
    })
  }
};