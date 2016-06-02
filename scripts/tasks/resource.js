/*
  
  Resource task collection
*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),


    neo4j     = require('seraph')(settings.neo4j.host),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    Resource  = require('../../models/resource'),
    Entity    = require('../../models/entity');

var task = {
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.getMany'));
    neo4j.query(
      ' MATCH (res:resource)\n'+
      ' RETURN res SKIP {offset} LIMIT {limit}', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Resource.FIELDS;
      options.records = nodes;
      callback(null, options)
      
    })
  },
  
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.getOne'),'id:', options.id);
    neo4j.query(
      ' MATCH (res:resource)\n'+
      ' WHERE id(res)={id} RETURN res LIMIT 1', {
      id: (+options.id || -1)
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      options.fields = Resource.FIELDS;
      options.records = nodes;
      callback(null, options)
      
    })
  },

  checkAnnotation: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.checkAnnotation'),'uuid:', options.uuid);
    neo4j.query(
      ' MATCH (res:resource {uuid:{uuid}})-[r]-(ann:annotation)\n'+
      ' RETURN res,r,ann', options, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      // console.log(nodes)
      console.log(clc.blackBright('   nodes:', clc.magentaBright(nodes.length)));
      var t = Resource.getAnnotatedText(nodes[0].res, nodes[0].ann)
      console.log(t)
      callback(null, options)
      
    })
  },

  
  /*
    cluster date basd on month
  */
  dateToMonths: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.dateToMonths'));
    var moment = require('moment');
    
    var q = async.queue(function (resource, next) {
      console.log(clc.blackBright('\n   resource: '), resource.id, clc.cyanBright(resource.slug.substring(0, 24)));
      
      var isToUpdate  = false,
          start_month = moment.utc(resource.start_time, 'X').format('YYYYMM'),
          end_month   = moment.utc(resource.end_time, 'X').format('YYYYMM');
          
      console.log(clc.blackBright('   start_date: '), resource.start_date)
      console.log(clc.blackBright('   start_month:'), start_month)
      console.log(clc.blackBright('   end_date:   '),   resource.end_date)
      console.log(clc.blackBright('   end_month:  '),   end_month)
        
      if(start_month != resource.start_month || end_month != resource.end_month )
        isToUpdate = true;
      
      if(isToUpdate) {
        console.log(clc.blackBright('   updating ...'));
        
        neo4j.query('MATCH (res) WHERE id(res) = {id} SET res.start_month = {start_month}, res.end_month = {end_month} RETURN res.name', {
          id: +resource.id,
          start_month: start_month,
          end_month: end_month
        }, function (err) {
          if(err) {
            q.kill()
            callback(err);
          } else {
            console.log(clc.greenBright('    saved!'), clc.blackBright('Remaining:'), q.length())
        
            next();
          }
        });
      } else {
        console.log(clc.blackBright('    nothing to do, skipping. Remaining:'), q.length())
        setTimeout(next, 2);
      }
      
    }, 10)
    q.push(_.filter(options.records, 'start_time'));
    q.drain = function() {
      callback(null, options);
    }   
  },
  
  /* check resource nodes for slug and names and date */
  slugify: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.slugify'));
    var slugs = _.compact(_.map(options.records, 'slug'));
    // queue: inquirer module needs premises
    var q = async.queue(function (i, next) {
      var isToUpdate = false;
      
      if(_.isEmpty(options.records[i].name)) {
        options.records[i].name = _.first(_.compact(settings.languages.map(function (d) {
          return options.records[i]['title_' + d]
        })).concat([
          'title'
        ]));
        isToUpdate = true
      }
      // if no name has been found, ask the user (or just throw an error)
      if(_.isEmpty(options.records[i].name)) {
        console.log(options.records[i])
        q.kill();
        callback('no name found for ' + options.records[i].id)
        return;
      }
      
      // clean from bogus html
      var newname  = options.records[i].name.replace(/(<([^>]+)>)/ig, '')
        .replace(/\s+/g, ' ').trim();
      
      if(newname != options.records[i].name) {
        options.records[i].name = newname
        isToUpdate = true
      }
      
      if(_.isEmpty(options.records[i].slug) || isToUpdate) {
        options.records[i].slug = helpers.text.slugify(options.records[i].name);
        //console.log('new slug:', options.records[i].slug)
        var c = 1,
            favouriteSlug = options.records[i].slug,
            slug = '' + favouriteSlug;
        while(slugs.indexOf(slug) != -1) {
          
          slug = favouriteSlug + '-' + c;
          console.log(clc.redBright('    new slug'),slug)
          c++
          
        }
        options.records[i].slug = slug;
        isToUpdate = true
      }
      slugs.push(options.records[i].slug)
        
      // save the name for the nodes
      if(isToUpdate) {
        console.log(clc.blackBright('    updating:'), options.records[i].slug)
        
        neo4j.query('MATCH (res) WHERE id(res) = {id} SET res.name = {name}, res.slug = {slug} RETURN res.name', {
          id: +options.records[i].id,
          name: options.records[i].name,
          slug: options.records[i].slug 
        }, function (err) {
          if(err) {
            q.kill()
            callback(err);
          } else {
            console.log(clc.greenBright('    saved!'), clc.blackBright('Remaining:'), q.length())
        
            next();
          }
        });
      } else {
        console.log(clc.blackBright('    nothing to do, skipping. Remaining:'), q.length())
        setTimeout(next, 2);
      }
        
    }, 5);
    q.push(_.keys(options.records));
    q.drain = function() {
      callback(null, options)
    }
  },
  cartoDB: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.cartoDB'));
    if(!options.target) {
      return callback(' Please specify the file path to write in with --target=path/to/source.tsv');
    }

    neo4j.query('MATCH (loc:location)-[rel:appears_in]->(res:resource) WHERE has(loc.lat) WITH loc, rel, res ORDER BY rel.frequency ASC WITH loc, last(collect(res)) as r, COUNT(res) as distribution, MIN(res.start_time) as start_time, MAX(res.end_time) as end_time RETURN {name: loc.name, lat: loc.lat, lng: loc.lng,start_time: start_time, distribution: distribution, end_time: end_time, example_title:COALESCE(r.name, r.title_en, r.title_fr), example_id:id(r), example_slug:r.slug} skip {offset} LIMIT {limit} ', {
        limit: +options.limit || 100000,
        offset: +options.offset || 0
    }, function(err, rows) {
      if(err) {
        callback(err);
        return
      }
      console.log('    cartodb: found', rows.length, 'rows')
      options.records = rows;
      options.fields = [
        'name',
        'lat',
        'lng',
        'start_time',
        'start_date',
        'end_time',
        'end_date',
        'example_title',
        'example_id',
        'example_slug',
        'distribution'
      ];
      options.filepath=options.target;
      
      callback(null, options)
    });
  },    
  
  importTwitter: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importTwitter'));
    console.log(options.data[0]);
    
     // check integrioty, @todo
    var q = async.queue(function (tweet, nextTweet) {
      var resource = {
        type: 'tweet',
        slug: 'tweet-' + tweet.id,
        mimetype: 'text/plain',
        name: tweet.from_user_name + ' - ' + helpers.text.excerpt(tweet.text, 32),
        
        user: options.marvin
      }

      // add time
      _.assign(resource, helpers.reconcileIntervals({
        start_date: tweet.time, 
        format: 'X'
      }))

      // language
      resource.languages = [ tweet.lang ];

      // title and caption
      resource['title_'+tweet.lang] = resource.name;
      // console.log(resource)
      resource['caption_'+tweet.lang] = '@' + tweet.from_user_name + ' - ' + tweet.text;

      // console.log(resource)
      resource.full_search = resource['caption_'+tweet.lang];

      
      console.log(clc.blackBright('   creating ...', clc.whiteBright(resource.slug)))
      
      console.log(resource);
      
      Resource.create(resource, function (err, res) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          console.log(clc.blackBright('   resource: ', clc.whiteBright(res.id), 'saved,', q.length(), 'resources remaining'));
      
          nextTweet();
          
        }
      })

    }, 3);
    q.push(options.data)
    q.drain = function(){
      callback(null, options);
    };
  },


  importInstagram: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importInstagram'));
    console.log(options.data[0]);

    var q = async.queue(function (item, nextItem) {
      console.log(item.user_username)
      var resource = {
        type: 'instagram',
        slug: 'instagram-' +item.id,
        mimetype: _.isEmpty(item.images)?'video':'image', 
        
        name:  (item.user_username ) + ' - ' + helpers.text.excerpt(item.caption_text, 32),
        user: options.marvin
      }

      console.log(clc.blackBright('    creating ...', clc.whiteBright(resource.slug)))
      
      // get the right url
      resource.url = path.join('instagram', (resource.mimetype == 'image'? item.images_name:item.videos_name))

      // test resource url
      var filename = path.join(settings.paths.media, resource.url);

      if(!fs.existsSync(filename)) {
        console.log(clc.magentaBright('    file does not exist:'),filename);
      } else {
          console.log(clc.greenBright('    file found'), resource.url);
      
      }

      resource.url = resource.url.replace("\\","/");

      // add time
      _.assign(resource, helpers.reconcileIntervals({
        start_date: item.created_time, 
        format: 'YYYY-MM-DD hh:mm:ss'
      }));

      var language = 'und'; // that is, impossible to guess, a special identifier is provided by ISO 639-2

      // var Langdetect = require('languagedetect'),
      //     langdetect = new Langdetect('iso2'),
      //     languages  = langdetect.detect(item.caption_text),
      //     language   = languages.length? _.first(_.first(languages)) : 'en';
      
      // console.log(languages)

      // language
      resource.languages = [ language ];

      // title and caption
      resource['title_'+language] = item.user_username + ' - ' + helpers.text.excerpt(item.caption_text, 32);

      // console.log(resource)
      resource['caption_'+language] = '@' + item.user_username + ' - ' + item.caption_text + ' - ' + _.compact(item.tags.split(/\s?,\s?/)).map(function(d){return '#'+d;}).join(', ');

      // console.log(resource);
      // add full text ;)
      resource.full_search = resource['caption_'+language];

      

      
      Resource.create(resource, function (err, res) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          console.log(clc.blackBright('   resource: ', clc.whiteBright(res.id), 'saved,', q.length(), 'resources remaining'));
        
          if(!_.isEmpty(item.location)){
            var latlng = item.location.split(/\s?,\s?/).join(',');
            console.log(latlng)
            // create entity from place (the first result is the good one)
            helpers.reverse_geocoding({latlng: latlng}, function (err, results) {
              console.log(err,results)
              if(err || !results.length)
                 nextItem();
              else
                Entity.create(_.assign(results[0], {
                  type: 'place',
                  resource: {
                    id: res.id
                  },
                  services: ['reverse_geocoding'],
                }), function(err, node) {
                  if(err) {
                    q.kill();
                    callback(err)
                  } else nextItem();
                })
            });
          } else
            nextItem();
          
        }
      })

    }, 1);
    q.push(options.data)
    q.drain = function(){
      callback(null, options);
    };
  },

  importData: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importData'));
    // check that data model is correct enough. 
    // Cfr. queries/resource.cyp --> merge_resource query
    var COLUMNS    = [ // mandatory column names
        'slug',
        'type', // according to settings.types.resources
        'languages',
        'title_en',
        'caption_en',
        'url_en',
        'start_date',
        'end_date',
        'viaf_id', // optional
        'doi'      // optional
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
    console.log(clc.yellowBright('\n   tasks.resource.discoverMany'));
    
    var queue = async.waterfall([
      // get pictures and documents having a caption
      function (next) {
        neo4j.query('MATCH (a:resource) WHERE NOT(has(a.discovered)) RETURN a ORDER BY a.mimetype ASC skip {offset} LIMIT {limit} ', {
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
            if(err == helpers.IS_EMPTY) {
              console.log('    node', node.id, clc.magentaBright('is empty'))
              neo4j.save(node, 'warnings', 'is_empty', function (e, n) {
                if(e) {
                  q.kill();
                  next(e);
                } else {
                  nextNode()
                }
              });
              return;
            } else if(err) {
              q.kill();
              next(err);
              return
            }

            res.discovered = true;
            neo4j.save(res, function (err, n) {
              if(err)
                throw err;
              console.log('node', n.id, n.uuid, clc.cyanBright('saved'))
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
    Simply test the get text function for a specific resource
  */
  getText: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.getText'));
    
    if(!options.language || options.language.length !=2 ) {
      callback('option --language required, 2 chars lang')
      return;
    }
    var text = Resource.getText(_.first(options.records), {
      language: options.language,
      fields: settings.disambiguation.fields
    });
    console.log(text);
    callback(null, options);
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
          if(err == helpers.IS_EMPTY) {
            console.log('    node', node.id, clc.magentaBright('is empty'))
            neo4j.save(node, 'warnings', 'is_empty', function (e, n) {
              if(e)
                next(e);
              else
                next(err);
            });
            return;
          } else if(err) {
            next(err);
            return
          }
          res.discovered = true;
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
  },

  /*
    Prepare tile for .jpg extension of url properties.
    The result will be put under settings.paths.media.tiles folder and renamled according to the
    neo4j identifier.
    a property named tiles_url will then be created directly below the 
    Note You should install mapslice manually if you want to enable it.

  */
  tiles: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.tiles'));
    var mapslice = require("mapslice");
    var q = async.queue(function (node, nextNode) {
      console.log('   resource:', clc.cyanBright(node.id))
              
      console.log(clc.blackBright('   resource remaining'), clc.white.bgMagenta(q.length()));
      var basedir  = path.join(path.isAbsolute(settings.paths.media)?'':__dirname,settings.paths.media),
          filename = path.join(basedir, node.url),
          output   = path.join(basedir, 'tiles', node.id + '/{z}/{y}/{x}.jpg');
      console.log('   input: ',filename);
      console.log('   output:', output);


      var mapSlicer = mapslice({
          file: filename,               // (required) Huge image to slice
          output: output, // Output file pattern
          // outputFolder: path.join(path.isAbsolute(settings.paths.media)?'':__dirname, settings.paths.media, 'tiles'),
          tileSize: 512,                     // (default: 256) Tile-size to be used
          imageMagick: true,                 // (default: false) If (true) then use ImageMagick instead of GraphicsMagick
          background: "#00000000",            // (default: '#FFFFFFFF') Background color to be used for the tiles. More: http://ow.ly/rsluD
          tmp: "./temp",                     // (default: '.tmp') Temporary directory to be used to store helper files
          parallelLimit: 3,                  // (default: 5) Maximum parallel tasks to be run at the same time (warning: processes can consume a lot of memory!)
          minWidth: 200                      // See explanation about Size detection below
      });

      mapSlicer.on("start", function(files, options) {
          console.log(clc.blackBright("    Starting to process", files, "files..."));
      });

      mapSlicer.on("error", function(err) {
          console.error(err);
      });

      mapSlicer.on("progress", function(progress, total, current, file) {
          console.info("    completion"+Math.round(progress*100)+"%");

      });

      mapSlicer.on("end", function() {
          console.log("    Finished processing slices.", arguments);
      });

      mapSlicer.start();

    }, 1);

    q.drain = function() {
      callback(null, options);
    }
    q.push(options.records.filter(function (d){
      if(!d.url)
        return false
      // console.log(d.id, d.url, d.url.match(/\.(png|jpg)$/))
      return d.url && d.url.match(/\.(png|jpg)$/)
    }));

    
 

  }
}

module.exports = task