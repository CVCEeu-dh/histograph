var settings   = require('../../settings'),
    helpers    = require('./helpers'),
    _          = require('lodash'),
    async      = require ('async'),
    clc        = require('cli-color'),
    fs         = require ('fs'),
    path       = require('path'),

    Resource   = require('../../models/resource'),
    Entity     = require('../../models/entity');;

var task = {
  importData: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.resource.importData'));
    // check that data model is correct enough. 
    // Cfr. queries/resource.cyp --> merge_resource query
    var COLUMNS    = [ // mandatory column names
        'mimetype', // e.g. text/plain
        'slug', // mandatory, unique per resource.
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
          
          
          var filename =  path.join((resource.mimetype == 'text/plain'? settings.paths.txt: settings.paths.media), resource['url_' + language]);
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

  bulkImport: function(options, callback){
    console.log(clc.yellowBright('\n   tasks.resource.importData'));
    

    if(!options.src) {
      console.log()
      callback('  missing: --src argument where the JOSN files are located (glob)')
      return;
    }

    console.log(clc.blackBright('   src glob path: '), options.src);

    var gulp        = require('gulp'),
        through     = require('through2');

    gulp.src(options.src)
      .pipe(function(){
        return through.obj(function (file, encoding, done) {
          if(file.isNull())
            return done(null, file);

          console.log(clc.blackBright('   processing:'), file.path);

          var graph = require(file.path);

          // checking for nodes and edges
          async.series(graph.nodes.filter(function(n){
            return n.mimetype
          }).map(function(n, i){
            return function saveNode(next){
              
              Resource.create(_.assign(n, {
                user: options.marvin
              }), function(err, node){
                if(err)
                  return next(err);
                console.log(clc.blackBright('   - node', clc.greenBright('saved!'), 'id:'), node.id, clc.blackBright('- slug:'),node.props.slug);
                // store node id directly in the graph;)
                n.id = node.id;
                next();
              })
              
            }
          }).concat(graph.links.map(function(n){
            return function savelink(next){
              var resource = _.find(graph.nodes, {slug: n.target}),
                  entity = _.find(graph.nodes, {slug: n.source});
              console.log(clc.blackBright('   - link:'), entity.slug, clc.blackBright('   --> resource:'), resource.id);

              // next()
              Entity.create(_.assign({
                resource: {
                  uuid: resource.id
                },
                username: options.marvin.username
              }, entity), function (err, entity) {
                if(err)
                  return next(err);
                console.log(clc.blackBright('   - entity', clc.greenBright('saved!'), 'id:'), entity.id, clc.blackBright('- slug:'),entity.props.slug);
                next()
              });

              // console.log(person)
              // get the node matching source and the node matching target

              // next();
            }
          })), function(err){
            // console.log(graph.nodes)
            if(err){
              console.log(err)
              throw err;
            }
            done(null, file);
          })
          
        })
      }()).on('finish', function() {
        console.log(clc.blackBright('   gulp task status:'), 'finished');
        callback(null, options)
      })

    
  }

}

module.exports={
  fromCSV: [ // bulk import resources from a single csv file
    helpers.csv.parse,
    helpers.marvin.create,
    task.importData
  ],
  fromJSON: [ // gulp-like bulk import form distinct json sources. require a --src argument
    helpers.marvin.create,
    task.bulkImport
  ]
}