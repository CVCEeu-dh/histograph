/*
  Correct annotations not having 
  correct uuids.
*/
/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),
    parser    = require('../../parser'),
    _         = require('lodash'),

    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs');

var task = {

  getAnnotations: function(options, callback ){
    console.log(clc.yellowBright('\n   tasks.annotations.getMany'));

    neo4j.query('MATCh(res:resource)-[r]-(ann:annotation) WHERE exists(ann.yaml) AND size(ann.yaml) > 0 WITH res,r,ann return res,r,ann LIMIT {limit}', options, function(err, res){
      if(err)
        return callback(err);
      options.records = res;
      callback(null, options);
    });
  },

  parseAnnotations: function(options, callback) {
    var q = async.queue(function(tuple, nextTuple){
      var yaml = parser.yaml(tuple.ann.yaml);
      console.log(tuple.res.uuid, yaml);
      // rewrite ids.
      async.series(yaml
        .filter(function(d){
          return !isNaN(d.id);
        })
        .map(function(d){
          return function(next){
            neo4j.query('MATCH (ent:entity) WHERE id(ent) = {id} RETURN ent', d, next);
          }
        }), function(err, results){
        if(err){
          q.kill();
          return callback(err);
        };
        

        results.forEach(function(d, i){
          if(d[0] && yaml[i].id == d[0].id){
            yaml[i].id = d[0].uuid;
          }
        })

        console.log('results', yaml);
        // save 
        neo4j.query('MATCH (ann:annotation) WHERE id(ann) = {id} SET ann.yaml = {yaml}',{
          id: tuple.ann.id,
          yaml:parser.toYaml(yaml)
        }, function(err){
          if(err){
            q.kill();
            return callback(err);
          }
          console.log(clc.blackBright('    saved annotation for resource:'), tuple.res.uuid);
          nextTuple();
        });
        // nextTuple();
      })
    }, 1);

    q.push(options.records);
    q.drain = function(){
      callback(null, options);
    }
  },

  getPositions: function(options, callback ){
    console.log(clc.yellowBright('\n   tasks.annotations.getPositions'));

    neo4j.query('MATCH (res:resource {type:"picture"})<-[r2:describes]-(pos:positioning) WITH DISTINCT res SKIP {offset} LIMIT {limit} WITH res MATCH (ent:entity)-[r:appears_in]->(res)<-[r2:describes]-(pos:positioning) WITH res, pos, collect(ent) as entities RETURN res, pos, entities', options, function(err, nodes){
      if(err)
        return callback(err);
      options.records = nodes;
      callback(null, options);
    });
  },

  parsePositions: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.annotations.parsePositions'));
    var q = async.queue(function(tuple, nextTuple){
      var yaml = parser.yaml(tuple.pos.yaml);
      console.log(clc.blackBright('\n    resource:', clc.cyanBright(tuple.res.uuid), '- n. entities:',clc.magentaBright(tuple.entities.length)));
      // rewrite ids.
      
      

      yaml = yaml.map(function(d,i){
        if(d && d.identification){
          // console.log(helpers.text.slugify(d.identification));
          var entity = _.find(_.map(tuple.entities, function(d){
            d._slug = helpers.text.slugify(d.name);
            return d;
          }), {
            _slug: helpers.text.slugify(d.identification)
          });
          // console.log(entity.uuid, entity.name)

          if(entity){
            console.log(clc.blackBright('    - using id:', clc.cyanBright(entity.uuid), '- name:', entity.name, 'for'), d.identification);
            d.id = entity.uuid
          }
          
        }
        return d;

      });

      // console.log(yaml)

      neo4j.query('MATCH (pos:positioning) WHERE id(pos) = {id} SET pos.yaml = {yaml}',{
        id: tuple.pos.id,
        yaml:parser.toYaml(yaml)
      }, function(err){
        if(err){
          q.kill();
          return callback(err);
        }
        console.log(clc.blackBright('    saved annotation for resource:', clc.cyanBright(tuple.res.uuid), 'remaining:', clc.magentaBright(q.length())));
        nextTuple();
      });

    }, 1);

    q.push(options.records);
    q.drain = function(){
      callback(null, options);
    }
  }
}

module.exports = {
  reannotate: [
    task.getAnnotations,
    task.parseAnnotations
  ],
  // reanootate position elements
  reposition: [
    task.getPositions,
    task.parsePositions
  ]
}