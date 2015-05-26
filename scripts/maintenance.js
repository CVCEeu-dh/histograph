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
  /*
    There is the need of reconiling links wiki
  */
  
  
  return;
  neo4j.query(
    'MATCH (source:entity),(alias:entity) ' +
    'WHERE id(source) <> id(alias) '+
    ' AND length(source.links_wiki) > 0 ' +
    ' AND source.links_wiki = alias.links_wiki ' +
    ' RETURN source, alias LIMIT 0', function (err, res) {
    if(err)
      throw err;
    console.log(res.length)
    
    var q = async.queue(function (couple, next) {
      // are they linked to the same resources ?
      // MATCH (n:entity)-[r]-(t),(n2:entity)-[r2]-(t2)
      // WHERE id(n) = 17163 AND id(n2) = 26414
      // RETURN n,n2,r,r2,t,t2
      console.log('remaining', q.length())
      neo4j.query(
        ' MATCH (alias)-[r]-(related)'+
        '   WHERE id(alias)={alias_id}' +
        ' RETURN id(alias) as alias_id, id(related) as related_id, r', {
          alias_id: couple.alias.id,
        }, function (err, nodes) {
          if(err)
            throw err;
          
          var q1 = async.queue( function (triple, nextTriple) {
            var source_id,
                target_id;
                
            if(triple.alias_id == triple.r.start) {
              source_id = couple.source.id;
              target_id = triple.r.end;
            } else if(triple.alias_id == triple.r.end) {
              source_id =  triple.r.start;
              target_id =  couple.source.id;
            } else {
              throw 'impossible'
            };
            // specify properties!!
            var properties = triple.r.properties;
            
            neo4j.query(
              ' MATCH (source), (target)' +
              '   WHERE id(source)={source_id} AND id(target)={target_id}' + 
              ' WITH source, target '+
              ' MERGE (source)-[r:'+ triple.r.type +']->(target)' +
              ' RETURN source, target, r', {
                source_id: source_id,
                target_id: target_id
              }, function (err, t) {
                if(err)
                  throw err;
                neo4j.rel.delete(triple.r.id, function(err) {
                  err && console.log(err)
                  if(err)
                    throw err;
                  nextTriple();
                });
              }
            )
            
           
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
    }, 1);
    
    q.push(res);
    q.drain = function() {
      console.log('---- ended ----');
    };
    
     
  });
}