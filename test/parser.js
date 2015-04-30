/*
  
  Testing parser
  ===

*/
'use strict';

var parser  = require('../parser.js'),
    helpers = require('../helpers.js'),
    should  = require('should');

describe('parser: split a string, add annotations.', function() {
  var points;

  it('should correctly parse the yaml', function (done) {
    // body...
    points = parser.yaml('-\n    id: 25867\n    context: {left: 48, right: 52}\n-\n    id: 27023\n    context: {left: 71, right: 89}\n-\n    id: 27023\n    context: {left: 75, right: 89}\n-\n    id: 25867\n    context: {left: 203, right: 207}\n-\n    id: 27034\n    context: {left: 245, right: 251}\n-\n    id: 25867\n    context: {left: 302, right: 306}\n-\n    id: 18317\n    context: {left: 48, right: 52}\n-\n    id: 27025\n    context: {left: 71, right: 89}\n-\n    id: 27025\n    context: {left: 75, right: 89}\n-\n    id: 18317\n    context: {left: 203, right: 207}\n-\n    id: 27035\n    context: {left: 245, right: 251}\n-\n    id: 18317\n    context: {left: 302, right: 306}');
    should.equal(points.length, 12);

    done()
  });

  it('should correctly rebuild the chain based on the yaml', function (done) {
    // note that the chain is joined with '§ '
    var text = 'European Parliament Resolution on the Treaty of Nice and the future of the European Union (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of Nice and the Declaration on the Future of Europe. The European Parliament notes that the Treaty of Nice removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).';

    var annotated = parser.annotate(text, points);

    should.equal(annotated, "European Parliament Resolution on the Treaty of [Nice](25867,18317) and the future of [the ](27023,27025)[European Union](27023,27025) (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of [Nice](25867,18317) and the Declaration on the Future of [Europe](27034,27035). The European Parliament notes that the Treaty of [Nice](25867,18317) removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).");

    done()
  });

  it('should correctly parse the second more complex yaml', function (done) {
    this.timeout(15000);
    // body...
    helpers.textrazor('Alois Mock and Gyula Horn open the Iron Curtain between Austria and Hungary (27 June 1989)§ On 27 June 1989, Alois Mock, Austrian Foreign Minister (left), and his Hungarian counterpart, Gyula Horn, together open the Iron Curtain separating Austria and Hungary.§ APA, die Bildagentur der Austria Presse Agentur'.split('§ ').join('. '), function (err, entities) {
      console.log('textrazor answered')
      if(err == helpers.IS_LIMIT_REACHED) {
        console.log('daily limit reached')
            // daily limit has been reached
        return;
      }
      if(err)
        throw err;
      
      var yaml = [];
      for(var i in entities)
        yaml.push({
          id: entities[i].id, // local entity id, or uri?
          context: entities[i].context
        });
      console.log(yaml)
      points = parser.yaml('-\n    id: 34632\n    context: {left: 14, right: 19}\n-\n    id: 34632\n    context: {left: 14, right: 28}\n-\n    id: 25958\n    context: {left: 32, right: 44}\n-\n    id: 25958\n    context: {left: 38, right: 44}\n-\n    id: 26998\n    context: {left: 113, right: 125}\n-\n    id: 25958\n    context: {left: 119, right: 125}\n-\n    id: 25958\n    context: {left: 148, right: 160}\n-\n    id: 25958\n    context: {left: 154, right: 160}\n-\n    id: 34632\n    context: {left: 242, right: 247}\n-\n    id: 34632\n    context: {left: 242, right: 256}\n-\n    id: 33767\n    context: {left: 259, right: 263}\n-\n    id: 34633\n    context: {left: 14, right: 19}\n-\n    id: 34633\n    context: {left: 14, right: 28}\n-\n    id: 26963\n    context: {left: 32, right: 44}\n-\n    id: 26963\n    context: {left: 38, right: 44}\n-\n    id: 26999\n    context: {left: 113, right: 125}\n-\n    id: 26963\n    context: {left: 119, right: 125}\n-\n    id: 26963\n    context: {left: 148, right: 160}\n-\n    id: 26963\n    context: {left: 154, right: 160}\n-\n    id: 34633\n    context: {left: 242, right: 247}\n-\n    id: 34633\n    context: {left: 242, right: 256}\n-\n    id: 33768\n    context: {left: 259, right: 263}\n');
      console.log(points)
      should.equal(points.length, 12);

      done()
      
    });
  });

  it('should correctly rebuild the chain based on the yaml', function (done) {
    // note that the chain is joined with '§ '
    var text = 'Alois Mock and Gyula Horn open the Iron Curtain between Austria and Hungary (27 June 1989)§ On 27 June 1989, Alois Mock, Austrian Foreign Minister (left), and his Hungarian counterpart, Gyula Horn, together open the Iron Curtain separating Austria and Hungary.§ APA, die Bildagentur der Austria Presse Agentur';

    var annotated = parser.annotate(text, points);
    
    //console.log('str',annotated)
    
    done()
  });
});