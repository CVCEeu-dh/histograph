/**
  Text importer with DOI (for the moment).
  Just provide the script the folder and that's it.
  $ npm run-script import /path-to-data/txt

  eaxch file name should be coded like this
  
  '0018ea81-0f2f-4184-92d0-54c99ef0f63f_textplain_de.txt'
  
  doi_mimetype_lang.ext

*/
var  fs       = require('fs'),
    path      = require('path'),
    settings  = require('../settings'),
    helpers   = require('../helpers'),
    YAML      = require('yamljs'),
    csv       = require('csv'),
    queries   = require('decypher')('./queries/resource.cyp'),
    
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash');


var queue = async.waterfall([
    /**
      get the llist of the folder given as args
    */
    function (next) {
      var files = fs.readdirSync(process.argv[2]);
      
      var q = async.queue(function (filepath, nextFile) {
        var fileparts = path.basename(filepath, '.txt').split('_'),
            doi,
            type,
            lang;

        if( fileparts.length < 3)
          return nextFile()
        
        doi  = fileparts[0];
        lang = fileparts[2];

        // check language @todo
        console.log('doi', doi, lang, 'q', q.length())
        // save or merge the doi resource. The content would be stored 
        neo4j.query(
            'MERGE (res:resource {doi:{doi}, mimetype:{mimetype}}) ' 
          + 'ON CREATE SET '
          + ' res.languages={languages}, '
          + ' res.' + lang + '_url={url} '
          + 'ON MATCH SET '
          + ' res.' + lang + '_url={url},'
          + ' res.url={url}'
          + 'RETURN res', {
            languages: [lang],
            url: filepath,
            doi: doi,
            mimetype: 'text'
          }, function (err, nodes) {
            if(err)
              throw err;
            var languages = _.uniq(nodes[0].languages.concat([lang]));
            
            if(languages.length == nodes[0].languages.length) {
              console.log(nodes)
              nextFile()
              return;
            }
            nodes[0].languages = languages;
            neo4j.save(nodes[0], function (err, nodes) {
              if(err)
                throw err;
              console.log(nodes)
              nextFile();
            });
          }
        );
        
      }, 1);

      q.push(_.take(files, files.length));
      q.drain = function() {
        next();
      }
    },
    
    /**
        integrate csv files from the top
      
    */
    function (next) {
      var csvs = fs.readdirSync(process.argv[3]);
      
      var q = async.queue(function (filepath, nextFile) {
        console.log('next', path.join(process.argv[3],filepath),  'q', q.length());
        // our csv parser mechanism
        var parser = csv.parse({
          delimiter: ';',
          relax: true,
          columns: function (headers) { // trim headers name - if the have trailing spaces.
            return headers.map(function (d) {
              return d.trim();
            });
          }
        }, function (err, data){
          if(err)
            throw err;
          
          // filter data by doi presence (some lines can be empty)
          data = _.filter(data, 'doi');
          console.log(data.length)
          // save a csv node (collection)
          neo4j.query(queries.merge_collection_by_name, {
            name: filepath
          }, function (err, nodes) {
            if(err)
              throw (err);

            var collection = nodes[0],
                mimetypes = {
                  'Photo': 'image',
                  'Schéma' : 'diagram',
                  'Texte': 'text',
                  'Vidéo': 'video',
                  'Son'  : 'audio',
                  'Carte': 'map',
                  'Tableau': 'table'
                };
            // loop async into data
            var _q = async.queue(function (doi , nextDoi) {
              // merge resource doi if it exists or if type is Photo or Texte
              var doiType = doi.type.trim();
              if(doiType == 'Passport') {

              }
              if(['Intertitre', 'Unité'].indexOf(doiType) !== -1) {
                nextDoi();
                return;
               
              };
              if(['Passport'].indexOf(doiType) !== -1) {
                nextDoi();
                return;
              }
              if(mimetypes[doiType] == undefined) {
                nextDoi();
                return;
              }

              console.log('skippeing', doi.type, ' --> ', mimetypes[doiType])
                
              

              neo4j.query(queries.merge_resource_by_doi, {
                doi: doi.doi.trim(),
                name: doi.titre.trim(),
                caption: doi['légende'].trim(),
                source: doi.source.trim(),
                mimetype: mimetypes[doiType]
              }, function (err, nodes) {
                if(err) {
                  console.log(filepath)
                  throw (err);
                }

                neo4j.query(queries.merge_relationship_resource_collection, {
                  collection_id: collection.id,
                  resource_id: nodes[0].id
                }, function (err, rels) {
                  if(err)
                    throw (err);
                  nextDoi()
                })

                
                
              });
              console.log(doi);
              
            }, 1);

            _q.push(data);
            _q.drain = nextFile;
          });
        });
        // parse the csv file according to the custom parser
        fs.createReadStream(path.join(process.argv[3],filepath)).pipe(parser);

      }, 1);

      q.push(_.take(csvs, csvs.length));
      q.drain = function() {
        next();
      }

    }
  ], function() {
    console.log('ended');
  }
);