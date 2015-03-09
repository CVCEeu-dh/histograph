var fs = require('fs'),
    settings = require('./settings'),
    request  = require('request'),
    async    = require('async'),
    xml = require('xml2js'),

    _ = require('lodash');

// ics file names, one for each picture
var ics = fs.readdirSync(settings.ICSPath);


console.log('migrating ' +ics.length);

// for each ic file
fs.readFile(settings.ICSPath + '/' + ics[0], function(err, content) {
  console.log('file', ics[0])
  // for each object
  //   get the corresponding dbpedia ID FIRST CANDIDATE, then
  //   save region as markdown comment 
  //   use markdown comments jade like, separate objects with a md line ---
  //   ```
  //     dbpedia: http://dbpedia.org/resource/Helmut_Kohl
  //     
  //     region: [>top, >left, >right, >bottom]
  //     perspective: EyeLevel
  //     occlusion: None
  //     gender: Male
  //     ---
  //     
  //   ```
  //   add then the link to the object / dbpedia resources (filterlike) in a markdown Simple text 
  //
  //    
  //   save in a version node (n:resource) both markdown AND Simple text
  xml.parseString(content, {explicitArray: false}, function (err, result) {
    var resources = [];

    if(result.image_content.objects.object.length) {
      for(var i in result.image_content.objects.object) {
        var resource = {};
        resource.region  = result.image_content.objects.object[i].region;
        resource.identification  = result.image_content.objects.object[i].identification._;
        resources.push(resource);
      };
    } else {
      resources.push({
        region: result.image_content.objects.object.region,
        identification: result.image_content.objects.object.identification._
      })
    };
    
    var q = async.queue(function (resource, callback) {
        console.log('hello ' + resource.identification);
        resource.completed = true;
        
        request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' +  resource.identification, function (err, res, body) {
          if(err) {
            resource.error = err;
            callback();
          } else {  // parse xml of the response
            xml.parseString(body, function(err, result) {
              if(err) {
                resource.error = err;
              } else {
                console.log(result.ArrayOfResult.Result[0])
                resource.dbpedia = {
                  uri: result.ArrayOfResult.Result[0].URI[0],
                  label: result.ArrayOfResult.Result[0].Label[0],
                  description: result.ArrayOfResult.Result[0].Description[0]
                };
              } 
              callback();
            });
          }
        });
    });

    q.drain = function() {
      console.log('all items have been processed', resources);
    };

    q.push(resources, function (err) {
        console.log('finished processing item');
    });



    // for(var i=0; i < resources.length; i++) {
    //   var next = function() {
    //     return 
    //   };

    //   request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' + resources[i].identification, (function (item) {
    //     return function(err, res) {
    //       console.log(res, item)
    //     }
    //   })(resources[i]))
    // }
  })
})
// xml.parseString(xml, function (err, result) {
//     console.dir(result);
// });