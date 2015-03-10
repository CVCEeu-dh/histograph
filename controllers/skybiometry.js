/**

  Controller for SkyBiometry face tags
  ===
  
  Proxy for Skybiometry api calls on file upload
*/
var settings   = require('../settings'),
    multer     = require('multer'),
    request    = require('request'),

    fs = require('fs');


module.exports = {
  faceDetect: [multer(), function (req, res) {
    if(!req.files || !req.files.picture) {
      res.json({});
      return;
    }
    fs.readFile(req.files.picture.path, function (err, img) {
      if(err) {
        throw 'image cannot be retrieved'; // res.json()....
        return;
      }
      console.log('image', req.files.picture)
      
      request
        .post({
          url: 'http://api.skybiometry.com/fc/faces/detect',
          form: { 
            api_key:  settings.SKYBIOMETRYAPI_KEY,
            api_secret:  settings.SKYBIOMETRYAPI_SECRET,
            attributes: 'all',
            detect_all_feature_points:  true,
            urls: 'http://p9.storage.canalblog.com/94/70/249840/52899379.jpg'
          }
        })
        .on('response', function(response) {
          console.log('error', response.statusCode);
          
          var body = '';
          response.on('data', function (chunk) {
            body += chunk;
          });
          response.on('end', function () {
            console.log(body);
            // fs.writeFile('./contents/api_results/skybiometry.result.json', body);
            res.json({ message: 'Bear created0 dd!', item: JSON.parse(body)});
          });
        });
        

    }); // eof readFile
  }]
}