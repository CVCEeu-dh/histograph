/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Resource  = require('../../models/resource');

module.exports = {
  
  cartoDB: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.cartoDB'));
    if(!options.target) {
      return callback(' Please specify the file path to write in with --target=path/to/source.tsv');
    }
      
    var neo4j    = require('seraph')(settings.neo4j.host);
    
    neo4j.query('Match (loc:location)-[:appears_in]->(r:resource) WHERE has(loc.geocode_lat) RETURN {name: loc.name, lat: loc.geocode_lat, lng: loc.geocode_lng,start_time: r.start_time, start_date: r.start_date, end_time: r.end_time, end_date:r.end_date, title:COALESCE(r.name, r.title_en, r.title_fr), id:id(r)} skip {offset} LIMIT {limit} ', {
        limit: +options.limit || 1000,
        offset: +options.offset || 0
    }, function(err, rows) {
      if(err) {
        callback(err);
        return
      }
      options.records = rows;
      options.fields = [
        'name',
        'lat',
        'lng',
        'start_time',
        'start_date',
        'end_time',
        'end_date',
        'title',
        'id'
      ];
      options.filepath=options.target;
      
      callback(null, options)
    });
  },    
  
  importData: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importData'));
    // check that data model is correct enough. 
    // Cfr. queries/resource.cyp --> merge_resource query
    var COLUMNS    = [ // mandatory column names
        'slug',
        'languages',
        'title_en',
        'caption_en',
        'url_en',
        'start_date',
        'end_date',
        'viaf_id'
      ],
      
      languages,
      fields,
      expectedFields,
      neededFields;
      
    // get the fields from the very first line  
    fields = _.keys(_.first(options.data));
    
    // get the total amount of languages from columns names starting with title_* 
    languages = _.compact(fields.map(function (d) {
      var field = d.match(/^title_([a-za-z]{2})$/);
      if(field)
        return field[1]
      return;
    }));
    
    // get the expected fields according to language
    expectedFields = _.unique(
      COLUMNS.concat(
        _.flatten(
          languages.map(function (language) {
            return _.flatten(settings.disambiguation.fields.concat(['url']).map(function (field) {
              return field + '_' + language;
            }));
          })
        )
      )
    );
    
    // get the difference between the mandatory column names and the current column names
    neededFields = _.difference(expectedFields, fields);
    if(neededFields.length > 0) {
      console.log('  missing: ',neededFields)
      callback('missing fields in your tsv file first line')
      return;
    }
    
    // check that url are in place, for each resource
    options.data.forEach(function(resource) {
      languages.forEach(function (language) {
        if(!_.isEmpty(resource['url_' + language])) {
          var filename =  path.join(settings.paths.txt, resource['url_' + language]);
          console.log(clc.blackBright('   checking url: '), filename);
          // throw an error if the specified file cannot be found
          // console.log(fs.accessSync(filename))
          if(!fs.existsSync(filename)) {
            throw 'file not found.'
          }
        }
      })
    });
    
    console.log(clc.blackBright('   everything looks good, saving', clc.magentaBright(options.data.length), 'resources'));
        
    var q = async.queue(function (resource, next) {
      resource.user = options.marvin;
      resource.languages = _.compact(_.map(resource.languages.split(','),_.trim)).sort()
      
      resource.name = resource.name || resource.title_en;
      // check that every urls exist
      
      
      
      console.log(clc.blackBright('   creating ...', clc.whiteBright(resource.slug)))
      
      
      Resource.create(resource, function (err, res) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          console.log(clc.blackBright('   resource: ', clc.whiteBright(res.id), 'saved,', q.length(), 'resources remaining'));
      
          next();
          
        }
      })
    }, 1);
    q.push(options.data);
    q.drain = function() {
      callback(null, options);
    }
  },
  
  /*
    Give a slug to poor resources not having one
  */
  // slugMany: function(options, callback) {
  //   var neo4j = require('seraph')(settings.neo4j.host);
    
    
    
  //   neo4j.query('MATCH (res:resource) WHERE not(has(res.slug)) RETURN RES SKIP {offset} LIMIT {limit}', {
  //     limit: +options.limit || 10,
  //     offset: +options.offset || 0
  //   }, function(err, nodes) {
  //     if(err) {
  //       callback(err);
  //       return;
  //     }
  //     next(null, nodes);
  //   });
  //   //neo4j.query('MATCH (p:resource) WITH p.slug as slug, count(distinct p) AS nodes WITH slug, nodes WHERE nodes > 1 RETURN slug, nodes')
    
  // },
  
  discoverMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.discover'));
    
    var neo4j    = require('seraph')(settings.neo4j.host);
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.query('MATCH (a:resource) WHERE NOT(has(a.discovered)) AND NOT (a)-[:appears_in]-() RETURN a ORDER BY a.mimetype DESC skip {offset} LIMIT {limit} ', {
          limit: +options.limit || 10,
          offset: +options.offset || 0
        }, function (err, nodes) {
          if(err) {
            next(err);
            return;
          }
          next(null, nodes);
        });
      },
      /**
        Nicely add TEXTRAZOR api service to extract persons from resources having caption (an/or source field)
      */
      function (nodes, next) {
        var q = async.queue(function (node, nextNode) {
          console.log(clc.blackBright('resource remaining'), clc.white.bgMagenta(q.length()));
          
          Resource.discover({
            id: node.id
          }, function (err, res) {
            if(err)
              throw err;
            
            res.discovered = true;
            neo4j.save(res, function (err, n) {
              if(err)
                throw err;
              console.log('node', n.id, clc.cyanBright('saved'))
              console.log(clc.blackBright('waiting for the next resource ... remaining:', clc.white.bgMagenta(q.length())))
              setTimeout(nextNode, 1675);
            })
            
          });
        }, 1);
        q.push(nodes);
        q.drain = next;
      }
    ], function (err) {
      if(err)
        callback(err);
      else
        callback(null, options);
    });
  },
  /*
    Start the discover chain for one signle dicoument, useful for test purposes.
  */
  discoverOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.discoverOne'));
    if(!options.id || isNaN(options.id)) {
      callback('option --id required')
      return;
    }
    var neo4j    = require('seraph')(settings.neo4j.host);
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.read(options.id, function (err, node) {
          if(err) {
            next(err);
            return;
          }
          next(null, node);
        });
      },
      /**
        Nicely add YAGO/TEXTRAZOR api service to extract persons from resources having caption (an/or source field)
      */
      function (node, next) {
        Resource.discover({
          id: node.id
        }, function (err, res) {
          if(err) {
            next(err);
            return
          }
          neo4j.save(res, function (err, n) {
            if(err)
              throw err;
            console.log('node', n.id, clc.cyanBright('saved'))
            next();
          });
        })
      }
    ], function (err) {
      if(err)
        callback(err);
      else
        callback(null, options);
    });
  }
}