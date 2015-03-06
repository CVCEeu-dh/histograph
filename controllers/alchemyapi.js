/**

  Controller for allchemyAPI face tags
  ===
  
  Proxy for alchemy api calls
*/
var alchemyapi = require('alchemy-api'),
    settings   = require('../settings'),
    multer     = require('multer'),
    request    = require('request'),

    fs = require('fs')

    alchemy = new alchemyapi(settings.ALCHEMYAPI_KEY);

module.exports = {
  imageFaceTags: {
    url: [
      multer({
        onFileUploadStart: function (file) {
          console.log(file.originalname + ' is starting ...')
        },
        onFileUploadComplete: function (file) {
          console.log(file.fieldname + ' uploaded to  ' + file.path)
          done=true;
        }
      }),
      function(req, res) {
        fs.createReadStream(req.files.picture.path).pipe(
          request
            .post({
              url: 'http://access.alchemyapi.com/calls/image/ImageGetRankedImageFaceTags?imagePostMode=raw&outputMode=json&knowledgeGraph=1&apikey='  +settings.ALCHEMYAPI_KEY,
              headers: {
                'Content-Length': req.files.picture.size,
                'Content-type': 'multipart/form-data'
              }
            })
            .on('data', function(data) {
              // decompressed data as it is received
              res.json({ message: 'Bear created0 dd!', item: JSON.parse('' +data)});
            })
            .on('response', function(res) {
              if(res.statusCode != 200) {
                console.log(res.statusCode) // 200
                console.log(res.headers['content-type']) // 'image/png'
              } 
            })
        )

      // alchemy.imageKeywords('https://www.google.co.za/images/srpr/logo11w.png', {}, function(error, result) {
      //   console.log(error, result)
      //   res.json({ message: 'Bear created0 dd!' });
      // }) 
        
      
      }
    ]
  }
};