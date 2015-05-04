/*
  
  Testing services
  ===

*/
'use strict';


var services = require('../services'),
    should  = require('should');
    
describe('services: ', function() {
  it('should connect to the endpoint and return a result', function (done) {
    this.timeout(15000)
    services.yagoaida({
      text: 'Born in 1932 in Kaunas, Vytautas Landsbergis, former opponent of the Soviet Communist regime in Lithuania and founder of Sajudis, the pro-independence movement, was President of Lithuania from 1990 to 1992 and Chairman of the Lithuanian Parliament from 1992 to 1996. He has been a Member of the European Parliament since 2004.'
    }, function(err, res){
        if(err)
          throw err;
      
      done()
    });
  })
});
