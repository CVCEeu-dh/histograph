/*
  
  Testing validator
  ===

*/
'use strict';


var validator = require('../validator.js'),
    should    = require('should');
   
   

describe('validator: using next', function() {
  it('should execute the function as expected', function(done) {
    var form = validator.request({}, {
      orderby: 'act.tf DESC, act.tfidf ASC'
    }, {}, function (err, params) {
      should.not.exist(err);
      should.exist(params.orderby);
      done();
    })
    
  });
});



describe('validator: check orderby field', function() {
  it('should work as expected', function (done) {
    var form = validator.request({}, {
      orderby: 'act.tf DESC, act.tfidf ASC'
    })
    should.not.exist(form.errors);
    should.exist(form.params.orderby);
    should.equal(form.isValid, true);
    done()
  });
  
  it('should NOT work as expected', function (done) {
    var form = validator.request({}, {
      orderby: 'with act DELETE act'
    })
    should.exist(form.errors);
    should.not.exist(form.params);
    should.equal(form.isValid, false);
    done()
  });
});



describe('validator: check limit and offset fields', function() {
  it('should work as expected', function (done) {
    var form = validator.request({}, {
      offset: 0,
      limit: 51
    });
    should.not.exist(form.errors);
    should.exist(form.params.offset);
    should.exist(form.params.limit);
    should.equal(form.isValid, true);
    done()
  });
  it('should work as expected with very big offset', function (done) {
    var form = validator.request({}, {
      offset: 10000002,
      limit: 51
    })
    should.not.exist(form.errors);
    should.exist(form.params.offset);
    should.exist(form.params.limit);
    should.equal(form.isValid, true);
    done()
  });
  it('should signale limit only', function (done) {
    var form = validator.request({}, {
      limit: 5000000,
      offset: 4
    })
    should.exist(form.errors);
    should.not.exist(form.params);
    should.equal(form.isValid, false);
    should.equal(form.errors[0].field, 'limit');
    
    done()
  });
  
  
  it('should signale offset only', function (done) {
    var form = validator.request({}, {
      limit: 50,
      offset: -4
    });
    should.exist(form.errors);
    should.not.exist(form.params);
    should.equal(form.isValid, false);
    should.equal(form.errors[0].field, 'offset');
    
    done()
  });
});

describe('validator: check mimetype field', function() {
  it('should NOT work, the field is not a proper one', function (done) {
    var form = validator.request({}, {
      mimetype: ['imagebig']
    })
    should.exist(form.errors);
    should.not.exist(form.params);
    should.equal(form.isValid, false);
    done();
  });
  
  it('should work with multiple filters', function (done) {
    var form = validator.request({}, {
      mimetype: ['image', 'video']
    })
    should.not.exist(form.errors);
    should.exist(form.params.mimetype);
    should.equal(form.params.mimetype.length, 2);
    should.equal(form.isValid, true);
    done();
  });
  
  it('should work with multiple filters, plain text', function (done) {
    var form = validator.request({}, {
      mimetype: 'image,video'
    })
    should.not.exist(form.errors);
    should.exist(form.params.mimetype);
    should.equal(form.params.mimetype.length, 2);
    should.equal(form.isValid, true);
    done();
  });
  
  it('should work with multiple TYPE filters, comma separated', function (done) {
    var form = validator.request({}, {
      type: 'letter,press'
    })
    console.log(form.params)
    should.not.exist(form.errors);
    should.exist(form.params.type);
    should.equal(form.params.type.length, 2);
    should.equal(form.isValid, true);
    done();
  });
  it('should NOT work with unrecognized TYPE filters, comma separated', function (done) {
    var form = validator.request({}, {
      type: 'letter,press'
    })
    console.log(form.params)
    should.not.exist(form.errors);
    should.exist(form.params.type);
    should.equal(form.params.type.length, 2);
    should.equal(form.isValid, true);
    done();
  });
  
});