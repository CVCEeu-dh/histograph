/*
  Command line for maintenance purposes.
  
  1.
  
  
*/
var settings = require('../settings'),
    options  = require('minimist')(process.argv.slice(2)),
    
    queries  = require('decypher')('queries/maintenance.cyp'),
    neo4j    = require('seraph')(settings.neo4j.host),
    async    = require('async'),
    
    clc = require('cli-color'),
    
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
  async.waterfall([
    function get_entity_duplicates_by_wiky (next) {
      /*
        There is the need of reconiling links wiki
        AUTOMATIC MERGE OF THE SAME ENTITY: same wikilink and same name.
      */
      neo4j.query(queries.get_entity_duplicates_by_wiky, function (err, duplicates) {
        console.log(clc.blackBright('  get_entity_duplicates_by_wiky'), clc.white.bgMagenta(duplicates.length))
        var q = async.queue(function (duplicates, nextDuplicates) {
          // get the very first entity as PRIMARY entity
          var superego = _.max(duplicates.ent, function(d) {
            return d.services? d.services.length: 0;
          });
          console.log(superego.name, superego.id, _.map(duplicates.ent, 'name'), _.map(duplicates.ent, 'id'),_.map(duplicates.ent, function(d) {
            return d.services? d.services.length: 0
          }));
          //console.log(superego)
          
          // for each duplicates ent, get all the relationships
          var q1 = async.queue(function (entity, nextEntity) {
            if(entity.id == superego.id) {
              console.log('ignore my superego', superego.id, entity.id)
              nextEntity();
              return;
            }
            neo4j.query(queries.get_entity_relationships, {
              alter_id: entity.id
            }, function (err, triplet) {
              if(err)
                throw err;
              var txn = neo4j.batch();
              //console.log('my ', triplet, 'query',entity.id, triplet.length)
              
              for(var t in triplet) {
                var source_id,
                    target_id;
                
                if(triplet[t].alter_id == triplet[t].r.start) {
                  source_id = superego.id;
                  target_id = triplet[t].r.end;
                } else if(triplet[t].alter_id == triplet[t].r.end) {
                  source_id = triplet[t].r.start;
                  target_id = superego.id;
                } else {
                  throw 'impossible'
                };
                console.log('cloning (',triplet[t].r.start,')-[r:', triplet[t].r.type ,']->(',triplet[t].r.end,')');
                // copy rels
                txn.query(
                  ' MATCH (source), (target)' +
                  ' WHERE id(source)={source_id} AND id(target)={target_id}' + 
                  ' WITH source, target '+
                  ' MERGE (source)-[r:'+ triplet[t].r.type +']->(target)' +
                ' RETURN source, target, r', {
                  source_id: source_id,
                  target_id: target_id
                });
                txn.rel.delete(triplet[t].r)
                // delete rels
              }
              txn.node.delete(entity.id)
              
              txn.commit(function (err, results) {
                if(err)
                  throw err;
                console.log(results.length)
                nextEntity();
              });
            });
          },1);
          q1.push(duplicates.ent);
          q1.drain = nextDuplicates(); 
        },1);
        
        q.push(duplicates)
        q.drain = next;
      });
    },
    /*
      Output a crowdsourcing activities FOR very very expert only.
    */
    function get_entity_duplicates_candidates_by_wiky (next) {
      
      neo4j.query(queries.get_entity_duplicates_candidates_by_wiky, function (err, candidates) {
        console.log(clc.blackBright('  get_entity_duplicates_candidates_by_wiky'), clc.white.bgMagenta(candidates.length));
        
        next()
      })
    
    },
  ], function() {
    console.log(clc.cyanBright('waterfall completed'));
    console.log()
  });
}