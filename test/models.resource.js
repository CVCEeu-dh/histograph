/*
  
  Test resource MODEL
  ===
  commandline usage:
  
  mocha -g 'model:resource'

*/
'use strict';

var settings  = require('../settings'),
    should    = require('should'),
    
    generator = require('../generator')({
                  suffix: 'resource'
                }),
    Resource  = require('../models/resource'),
    User      = require('../models/user');
    

var __user,
    __userB,
    __social_group,
    __resourceA,
    __resourceB;
    
// todo: create a new resource, discover its content, then retrieve its representation
describe('model:resource init', function() {
  it('should delete the user', function (done) {
    User.remove(generator.user.guest(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should create the dummy test user', function (done){
    User.create(generator.user.guest(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __user = user;
      done();
    });
  });
  
  it('should delete the user B', function (done) {
    User.remove(generator.user.researcher(), function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should create the dummy test user B', function (done){
    User.create(generator.user.researcher(), function (err, user) {
      if(err)
        throw err;
      should.exist(user.username);
      __userB = user;
      done();
    });
  });
  
  
});

/*
  Main part
*/

describe('model:resource ', function() {
  
  it('should create a new resource A', function (done){
    Resource.create(generator.resource.multilanguage({
      user: __user
    }), function (err, resource) {
      if(err)
        throw err;
      __resourceA = resource;
      done();
    });
  });
  
  it('should create a relationship with an entity', function (done) {
    Resource.createRelatedEntity(__resourceA, generator.entity.social_group(), function (err, entity) {
      __social_group = entity;
      should.equal(__social_group.rel.end, __resourceA.id)
      done();
    })
  });
  
  it('should create a relationship with a second user', function (done) {
    Resource.createRelatedUser(__resourceA, __userB, function (err, resource) {
      should.equal(resource.rel.start, __userB.id)
      should.equal(resource.rel.end, __resourceA.id)
      done();
    })
  });
  
  
  it('should get resource A plus social_group entity', function (done) {
    Resource.get(__resourceA, function (err, res) {
      if(err)
        throw err;
      should.equal(res.id, __resourceA.id)
      should.exist(res.props)
      should.exist(res.social_groups.length)
      should.equal(res.props.caption_en, __resourceA.props.caption_en)
      done()
    })
  })
  // it('should discover institutions, places and persons', function (done) {
  //   this.timeout(60000)
  //   Resource.discover(__resourceA, function (err, resource) {
  //     if(err)
  //       throw err;
  //     //console.log(resource)
  //     done();
  //   })
  // });
  
  it('should create a new resource B WITH URL', function (done){
    Resource.create({
      name: 'another untitled',
      doi: 'automatic doi generation, B',
      mimetype: 'text',
      title_en: "'Yalta, from failure to myth' from Le Monde (5 February 1985)",
      title_fr: "\"Yalta, de l'échec au mythe\" dans Le Monde (5 février 1985)",
      title_de: "\"Jalta – vom Scheitern zum Mythos\" in Le Monde (5. Februar 1985)",
      url_fr: 'not found.txt',
      url_en: 'not found.txt',
      caption_en: "From 4 to 11 February 1945, the Yalta Conference was attended by Winston Churchill, Franklin D. Roosevelt and Joseph Stalin who were to determine the future of Europe. Forty years on, André Fontaine questions the real significance of the Conference in an article published in the French daily newspaper Le Monde on 5 February 1985.",
      caption_fr: "Du 4 au 11 février 1945, la Conférence de Yalta réunit Winston Churchill, Franklin D. Roosevelt et Joseph Staline qui doivent décider du sort de l'Europe. Quarante ans plus tard, André Fontaine remet en question la portée effective de la conférence dans un article publié le 5 février 1985 dans le quotidien français Le Monde.",
      caption_de: "Vom 4. bis 11. Februar 1945 trafen sich Winston Churchill, Franklin D. Roosevelt und Joseph Staline auf der Konferenz von Jalta, um über das Schicksal Europas zu entscheiden. Vierzig Jahre später stellt André Fontaine die eigentliche Tragweite dieser Konferenz in einem am 5. Februar 1985 in der französischen Tageszeitung Le Monde veröffentlichten Artikel in Frage.",
      languages: ['en', 'fr', 'de'],
      user: __user,
    }, function (err, resource) {
      if(err)
        throw err;
      __resourceB = resource;
      done();
    });
  });
  
  it('should get the correct text to disambiguate the contents', function (done) {
    var contents = Resource.getText(__resourceA.props, {
      language: 'fr',
      fields: [
        'title',
        'caption',
        'url'
      ]
    });
    
    should.equal(contents, [__resourceA.props.title_fr, __resourceA.props.caption_fr].join('. '));
    done();
  });
  
  it('should get a partial text because the URL doesn\'t exist', function (done) {
    var contents = Resource.getText(__resourceB.props, {
      language: 'fr',
      fields: [
        'title',
        'caption',
        'url'
      ]
    });
    
    should.equal(contents, [__resourceB.props.title_fr, __resourceB.props.caption_fr].join('. '));
    done();
  })
  // it('should discover institutions, places and persons', function (done) {
  //   this.timeout(60000)
  //   Resource.discover({
  //     id: __resourceB.id
  //   }, function (err, resource) {
  //     if(err)
  //       throw err;
  //     //console.log(resource)
  //     done();
  //   })
  // });
  
  it('should get a correct representation of a resource', function (done) {
    Resource.get(__resourceB, function (err, res) {
      if(err)
        throw err;
      should.equal(res.id, __resourceB.id)
      should.exist(res.props)
      should.equal(res.props.caption_en, __resourceB.props.caption_en)
      done()
    })
  })
  it('should get a list of available resources', function (done) {
    Resource.getMany({
      limit: 3,
      offset: 0
    }, function (err, items, info) {
      if(err)
        throw err;
      // console.log(items[0])
      should.exist(items.length)
      should.exist(info.total_items)
      done()
    })
  })
  it('should get a list of available resources by ids', function (done) {
    Resource.getByIds({
      ids: [__resourceB.id, __resourceA.id]
    }, function (err, items, info) {
      if(err)
        throw err;
      // console.log(items[0])
      should.exist(items.length)
      should.exist(info.total_items)
      done()
    })
  })
  it('should get a list of similarresources resources by ids', function (done) {
    Resource.getRelatedResources({
      id: __resourceA.id,
      limit: 10,
      offset: 0,
    }, function (err, items, info) {
      if(err)
        throw err;
      // console.log(items[0])
      should.exist(items.length)
      should.exist(info.total_items)
      done()
    })
  })
  it('should get a list of available resources matching a specific entity', function (done) {
    Resource.getMany({
      limit: 3,
      offset: 0,
      entity_id: __social_group.id
    }, function (err, items, info) {
      if(err)
        console.log(err);
      // console.log(__social_group.id, items[1],info.total_items)
      should.exist(items[0]) // at least one item have to be here
      should.exist(items.length)
      should.exist(info.total_items)
      done()
    })
  })
  
  it('should get the graph of entities attached', function (done) {
    Resource.getRelatedEntitiesGraph({
      id: __resourceA.id,
      entity: 'person',
      limit: 100,
      offset: 0
    }, function (err, graph) {
      if(err)
        console.log(err);
      // console.log(__social_group.id, items[1],info.total_items)
      should.exist(graph.nodes);
      should.exist(graph.edges);
      done()
    })
  })
  
  
  it('should return the timeline of resources', function (done) {
    Resource.getTimeline({}, function (err, res) {
      should.not.exist(err);
      done()
    })
  })
  
  it('should return the timeline of related resources', function (done) {
    Resource.getRelatedResourcesTimeline({
       id: __resourceA.id
    }, function (err, res) {
      should.not.exist(err);
      done()
    })
  })
  
  it('should get a NOT found error', function (done) {
    Resource.get(111600000000, function (err, res) {
      should.exist(err)
      done()
    })
  })
  
  it('should delete the resource A', function (done) {
    Resource.remove({
      id: __resourceA.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
  it('should delete the resource B', function (done) {
    Resource.remove({
      id: __resourceA.id
    }, function (err) {
      should.not.exist(err);
      done();
    })
  });
 
});

describe('model:resource cleaning', function() {
  it('should delete the user', function (done) {
    User.remove({email: __user.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
  it('should delete the userB', function (done) {
    User.remove({email: __userB.email}, function (err) {
      if(err)
        throw err;
      done();
    });
  });
});