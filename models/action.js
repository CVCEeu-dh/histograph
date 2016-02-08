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
  UPVOTE:      'upvote',

  ENTITY_LABEL: 'ENTITY_LABEL',
  ENTITY_WRONG: 'ENTITY_WRONG',
  APPEARS_IN_RELATIONSHIP: 'APPEARS_IN_RELATIONSHIP',
  LIKES_RELATIONSHIP: 'LIKES_RELATIONSHIP'
});
