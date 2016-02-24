/**
 * Action Model
 * ============
 *  
 * Whenever an user does something.
 * Rules:
 * (u:user)-1-[:performs]-1->(a:action:upvote {target:relationship|entity})-[:mentions]->(n)
 * (u:user)-1-[:performs]-1->(a:action:downvote {target:relationship|entity})-[:mentions]->(n)
 * (u:user)-1-[:performs]-1->(a:action:create {target:relationship})-[:mentions]->(n)
 */

var settings  = require('../settings'),
    queries   = require('decypher')('./queries/action.cyp'),
    model     = require('../helpers/models');
    async     = require('async'),
    _         = require('lodash');

module.exports = _.assign(model.generate({
  model:     'action',
  pluralize: 'actions',
  queries:   queries
}), {
  ANNOTATE:    'annotate',
  CREATE:      'create',
  DOWNVOTE:    'downvote',
  MERGE:       'merge',
  RAISE_ISSUE: 'issued',
  DOWNVOTE_ISSUE: 'downvoteissue',
  UPVOTE:      'upvote',

  /*
    issue type
  */
  ISSUE_CHECK_DATE: 'date',
  ISSUE_CHECK_TYPE: 'type',
  ISSUE_CHECK_CAN_MERGE: 'mergeable',
  ISSUE_CHECK_IS_IRRELEVANT: 'irrelevant',
  ISSUE_CHECK_IS_WRONG: 'wrong',
  /*
    Get te correct target for issue kind cfr (cypher query)
  */
  getTargetByIssue: function(issue) {
    if(issue == module.exports.ISSUE_CHECK_CAN_MERGE)
      return module.exports.ENTITY_MERGE;
    if(issue == module.exports.ISSUE_CHECK_IS_WRONG)
      return module.exports.ENTITY_WRONG;
    if(issue == module.exports.ISSUE_CHECK_TYPE)
      return module.exports.ENTITY_LABEL;
  },


  BRAND_NEW_ENTITY: 'BRAND_NEW_ENTITY',
  ENTITY_LABEL: 'ENTITY_LABEL',
  ENTITY_WRONG: 'ENTITY_WRONG',
  ENTITY_MERGE: 'ENTITY_MERGE',
  APPEARS_IN_RELATIONSHIP: 'APPEARS_IN_RELATIONSHIP',
  LIKES_RELATIONSHIP: 'LIKES_RELATIONSHIP'
});
