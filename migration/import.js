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
    csv      = require('csv'),
    //queries   = require('decypher')('./queries/migration.import.cyp'),
    
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash');


var queue = async.waterfall([
    /**
      get the llist of the folder given as args
    */
    function (next) {
      var files = fs.readdirSync(process.argv[2]);
      //console.log(_.take(files, 12));

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
          + ' res.' + lang + '_url={url }'
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

      q.push(_.take(files, 0));
      q.drain = function() {
        next();
      }
    },
    
    /**
        integrate csv files from the top
      
    */
    function(next) {
      var csvs = fs.readdirSync(process.argv[3]);

      
      var q = async.queue(function (filepath, nextFile) {
        console.log('next', path.join(process.argv[3],filepath))
        var parser = csv.parse({delimiter: ','}, function(err, data){
          if(err)
            throw err
          console.log(_.take(data, 5));
          nextFile();
        });
        fs.createReadStream(path.join(process.argv[3],filepath)).pipe(parser);

      }, 1);


    }
  ], function() {
    console.log('ended');
  }
);