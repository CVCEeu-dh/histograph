var fs = require('fs'),
    settings = require('./settings'),

    xml = require('xml2js');

// ics file names, one for each picture
var ics = fs.readdirSync(settings.ICSPath);


console.log(ics[1])

fs.readFile(settings.ICSPath + '/' + ics[1], function(err, content) {

  xml.parseString(content, function (err, result) {
    console.log( result.image_content.objects);
  })
})
// xml.parseString(xml, function (err, result) {
//     console.dir(result);
// });