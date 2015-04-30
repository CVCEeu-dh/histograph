/*
  Command line for discover process.
  Usage:
  node .\scripts\discover.js --resourceid=11160
 
*/

var options = require('minimist')(process.argv.slice(2)),
    resource = require('../models/resource');
    

console.log(options);

if(!options.resourceid || isNaN(options.resourceid))
  throw 'check your --resource value. Should be an integer id!'

resource.discover(options.resourceid, function(err, res) {
  console.log(res)
})