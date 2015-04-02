/**

  Controller for Rekognition Face tags
  ===
  
  Proxy for Rekognition api calls
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
      var encoded_image = img.toString('base64');
      request
        .post({
          url: 'http://rekognition.com/func/api/',
          form: { 
            api_key:  settings.REKOGNITIONAPI_KEY,
            api_secret:  settings.REKOGNITIONAPI_SECRET,
            jobs: 'face_part_detail_aggressive',
            base64:  encoded_image,
          }
        }).pipe(fs.createWriteStream('./doodle.json'))
        .on('data', function(data) {
          // decompressed data as it is received
          res.json({ message: 'Bear created0 dd!', item: JSON.parse('' +data)});
        })

    }); // eof readFile
    
    return;
    // read image and send it to rekognition service
    
  }],
  faceSearch: [multer(), function (req, res) {
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
      var encoded_image = img.toString('base64');
      request
        .post({
          url: 'http://rekognition.com/func/api/',
          form: { 
            api_key: settings.rekognition.API_KEY,
            api_secret: settings.rekognition.API_SECRET,
            jobs: 'face_part_detail_recognize_emotion_beauty_gender_emotion_race_eye_smile_mouth_age_aggressive',
            base64: encoded_image,
            name_space: settings.rekognition.NAME_SPACE,
            user_id: settings.rekognition.USER_ID
          }
        })
        .on('response', function(response) {
          console.log('error', response.statusCode);
          
          var body = '';
          response.on('data', function (chunk) {
            body += chunk;
          });
          response.on('end', function () {
            // fs.writeFile('./rekognition.result.json', body);
            res.json({ message: 'Bear created0 dd!', item: JSON.parse(body)});
          });
        });
        

    }); // eof readFile
  }]
}
