/*
  Command line for maintenance purposes.
  
  1.
  
  
*/
var settings = require('../settings'),
    options  = require('minimist')(process.argv.slice(2)),
    
    neo4j    = require('seraph')(settings.neo4j.host),
    async    = require('async'),
    _        = require('lodash');

/*
  usage node maintenance.js --links_wiki
  
  Perform entity duplicate cleaning on links. Sometime it happens that
  an entity will be recognized later as wiki, there is the problem of mergin links.

  MATCH (n:entity),(n2:entity)
  WHERE id(n) <> id(n2)
  AND n.links_wiki = n2.links_wiki
  RETURN n,n2 LIMIT 20
*/
if(options.links_wiki) {
  neo4j.query(
    'MATCH (source:entity),(alias:entity) ' +
    'WHERE id(source) <> id(alias) '+
    ' AND length(source.links_wiki) > 0 ' +
    ' AND source.links_wiki = alias.links_wiki ' +
    ' RETURN source, alias LIMIT 1', function (err, res) {
    if(err)
      throw err;
    console.log(res.length)
    
    var q = async.queue(function (couple, next) {
      // are they linked to the same resources ?
      // MATCH (n:entity)-[r]-(t),(n2:entity)-[r2]-(t2)
      // WHERE id(n) = 17167 AND id(n2) = 26880
      // RETURN n,n2,r,r2,t,t2

      neo4j.query(
        ' MATCH (alias)-[r]-(related)'+
        ' WHERE id(alias)={alias_id}' +
        ' RETURN id(alias) as alias_id, id(related) as related_id, r', {
          alias_id: couple.alias.id,
        }, function (err, nodes) {
          if(err)
            throw err;
          
          var q1 = async.queue( function (triple, nextTriple) {
            if(triple.alias_id == triple.r.start) {
              triple.r.start = couple.source.id;
            } else if(triple.alias_id == triple.r.end) {
              triple.r.end = couple.source.id;
            } else {
              throw 'impossible'
            };
            console.log(triple.r)
          },1);
          q1.push(nodes);
          q1.drain = next;
      })
      
      
      console.log(couple.source.id, couple.source.name, ' -----> ', couple.alias.id, couple.alias.name);
      // _.merge(couple.n, couple.alias, function(a, b) {
      //   //console.log(a, b);
      //   if (_.isArray(a)) {
      //     return a.concat(b);
      //   }
      // });
    }, 3);
    
    q.push(res);
    q.drain = function() {
      console.log('---- ended ----');
    };
    
     
  });
}