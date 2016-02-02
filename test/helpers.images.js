/*
  
  Testing helpers/images (image manipulation mechanism)
  ===

*/
'use strict';


var settings  = require('../settings'),
    images  = require('../helpers/images'),
    should  = require('should');


describe('helpers: images crop image', function() {
  it('should transform wiki url into underscored ones', function (done) {
    // get sample image from somewhere and save it to test folder
    if(!settings.imagemagick) {
      console.log('settings.imagemagick is not enabled')
      done();
      return;
    }
    images.crop({
      src: 'test/sample.jpg',
      width: 100,
      height: 200,
      x: 30,
      y: 50
    }, function (err, res) {
      should.not.exist(err);
      done();
    });
  });
});