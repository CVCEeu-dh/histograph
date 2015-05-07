/*
  
  Test Collection model
  ===
  commandline usage:
  
  mocha -g 'model:entity'

*/
'use strict';

var settings = require('../settings'),
    entity   = require('../models/entity'),
    should   = require('should');
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:entity ', function() {
  it('should return a signle entity', function (done) {
    entity.get(20381, '', function(err, res){
      if(err)
        throw err;
      done()
    })
  });
});