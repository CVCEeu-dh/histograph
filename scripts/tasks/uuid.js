/*
  Allow to correct db errors when uuid is not present (or it has been deleted)
*/
var settings   = require('../../settings'),
    helpers    = require('../../helpers'),
    clc        = require('cli-color'),
    async      = require('async'),
    neo4j      = require('seraph')(settings.neo4j.host);



var task = {
  /*
    get the nodes in db not having uuid
  */
  withoutuuid: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.uuid.withoutuuid'));
    neo4j.query('MATCH (n) WHERE n.uuid IS NULL RETURN n LIMIT 10000', function(err, nodes) {
      if(err){
        callback(err)
      } else{
        options.records = nodes;
        callback(null, options);
      }
    })
  },
  setuuid: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.uuid.setuuid'));

    console.log(clc.blackBright('    nodes without id:'), options.records.length);
    
    var q = async.queue(function(node, nextNode){
      console.log(clc.blackBright('     adding uuid to:'), node.id);
      // neo4j.save()
      neo4j.save(node, 'uuid', helpers.uuid(), function(err, node) {
        if(err){
          q.kill();
          callback(err)
        } else {
          console.log(clc.blackBright('     uuid added to: ', clc.greenBright(node.id), clc.cyanBright(node.uuid), 'remaining'),q.length());
          nextNode();
        }
      });
    }, 2);

    q.push(options.records);
    q.drain = function(){
      callback(null, options);
    }

  }
}

module.exports = [
  task.withoutuuid,
  task.setuuid
]