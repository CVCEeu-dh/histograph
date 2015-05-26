/*
  Command line for maintenance purposes.
  
  1.
  
  
*/
var fs       = require('fs'),
    csv      = require('csv'),
    
    settings = require('../settings'),
    options  = require('minimist')(process.argv.slice(2)),
    
    entity   = require('../models/entity'),
    
    neo4j    = require('seraph')(settings.neo4j.host),
    async    = require('async'),
    _        = require('lodash');


if(options.entityid) {
  if(options.entityid === true || isNaN(options.entityid))
    throw 'check your --entityid value. Should be an integer id!'
  console.log(options.entityid)
  entity.inspect(options.entityid, {}, function (err, node, inspectionResults) {
    if(err)
      throw err;
    if(inspectionResults.length == 0)
      return true
    for(var i in inspectionResults) {
      console.log(inspectionResults[i].need);
      console.log(inspectionResults[i].cause);
    }
  })
  return;
}

if(options.entities) {
  if(isNaN(options.limit))
    options.limit = 20;
  if(isNaN(options.offset))
    options.offset = 0;
  
  var tobecrowdsourced = {}; // {id : {errors:[]}
  
  
  neo4j.query(
    ' MATCH (n:`entity`)' +
    ' RETURN n SKIP{offset} LIMIT {limit}', {
      offset: options.offset,
      limit: options.limit
    }, function (err, nodes) {
      if(err)
        throw err;
      
      var q = async.queue(function (node, nextNode) {
        console.log('entities remaining', q.length(), '/', nodes.length)
        entity.inspect(node.id, {}, function (err, node, errors, warnings) {
          if(err)
            throw err;
          if(errors.length == 0) {
            setTimeout(nextNode, 239);
            return;
          }
          if(!tobecrowdsourced[node.id]) {
            tobecrowdsourced[node.id] = {
              errors: [],
              warnings: []
            };
          }
         
          for(var i in errors) {
            tobecrowdsourced[node.id].errors.push(errors[i])
          }
          setTimeout(nextNode, 239);
        })
      }, 1);
      q.push(nodes);
      q.drain = function(){
        
        console.log(_.values(tobecrowdsourced).length, ' over', options.limit);
        fs.writeFile(settings.paths.crowdsourcing + '/inspect_results.json', JSON.stringify(tobecrowdsourced, null, 2), function(err, res) {
          console.log('ended');
        });
      };
      
  });
  
    
  
  return;
}