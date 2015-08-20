/*
  
  Testing services
  ===
  test with 
  mocha -g 'services:'
  
  Note: most services have been commented out, since they require an api key
  and have a limited amount of requests.
  Feel free to comment them out in order to test them.
*/
'use strict';


var services = require('../services'),
    should  = require('should');
    
describe('services: ', function() {
  // it('should connect to the Textrazor endpoint and return some results', function (done) {
  //   this.timeout(15000)
  //   services.textrazor({
  //     text: 'Born in 1932 in Kaunas, Vytautas Landsbergis, former opponent of the Soviet Communist regime in Lithuania and founder of Sajudis, the pro-independence movement, was President of Lithuania from 1990 to 1992 and Chairman of the Lithuanian Parliament from 1992 to 1996. He has been a Member of the European Parliament since 2004.'
  //   }, function (err, entitites){
      
  //     if(err)
  //         throw err;
  //     should.exist(entitites.length);
  //     done()
  //   });
  // })
   
  // it('should connect to the endpoint and return a result', function (done) {
  //   this.timeout(25000)
  //   services.yagoaida({
  //     text: 'Born in 1932 in Kaunas, Vytautas Landsbergis, former opponent of the Soviet Communist regime in Lithuania and founder of Sajudis, the pro-independence movement, was President of Lithuania from 1990 to 1992 and Chairman of the Lithuanian Parliament from 1992 to 1996. He has been a Member of the European Parliament since 2004.'
  //   }, function(err, entities){
  //       if(err)
  //         throw err;
  //     // persons 
  //     var persons = entities.filter(function(d) {
  //       return d.type.map( function(t){
  //         return t.replace(/\d/g, '');
  //       }).indexOf('YAGO_wordnet_person_') !== -1
  //     })
      
  //     var locations = entities.filter(function(d) {
  //       return d.type.map( function(t){
  //         return t.replace(/\d/g, '');
  //       }).indexOf('YAGO_wordnet_administrative_district_') !== -1
  //     })
  //     // remap candidates: person with YAGO super special bis
  //     console.log(locations.map(function (d){return d.matchedText}))
  //     done()
  //   });
  // })
});
