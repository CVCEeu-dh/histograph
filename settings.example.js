/**

  Config file
  ===
*/
module.exports = {
  baseurl: 'http://localhost:8000', // the remote address used to handle OAuth2 callbacks, without TRAILING slashes
  port: 8000,
  env: 'development', // production | development
  title: 'Histograph', // name of 
  authOrReadOnlyMode: false,
  anonymousUser: {
    props: {
      firstname: 'anonymous',
      lastname: 'user'
    },
    username:  'anonymous',
    picture:   'anonymous.jpg'
  },

  secret: {
    cookie: 'cookie secret', // cookie salt
    salt: 'salt secret for password', // password salt
    activation: 'activation salt for activation link', // password salt
  },
  
  paths: {
    dist: './client/dist',
    media: './contents/media',
    txt: './contents/txt',
    accesslog: './logs/access.log',
    cache: {
      disambiguation: './contents/cache/disambiguation',
      dbpedia: './contents/cache/dbpedia',
      queries: './contents/cache/queries',
      services: './contents/cache/services',
    }
  },

  neo4j : { // > 2.2
    host : {
      server: 'http://localhost:7474',
      user: 'neo4j',
      pass: 'neo4j'
    }
  },
  
  /*
    google analytics account to track view pages
  */
  analytics: {
    // account: 'UA-XXXXXXXXX-1',
    domainName: 'none'
  },

  // list of resource fields to analyse.
  // note that the language will be appended.
  disambiguation: {
    fields: [
      'title',
      'caption',
      'url'
    ],
    services: {
      'yagoaida': ['en']
    },
    geoservices: {
      'geonames': ['en', 'fr', 'de', 'nl'],
      'geocoding': ['en', 'fr', 'de', 'nl']
    },
    typeRelatedServices: [
      'instagram',
      'tweet'
    ],
    regexp: {
      'textrazor':[
        {
          pattern: /[@#❤️📷]/g,
          replace: ' '
        }
      ]
    }
  },
  
  /*
    Enable the cache mechanism with redis-server
  
  cache: {
    redis: {
      host: 'localhost',
      port: 6379
    }
  },
  */
  
  /*
    Grouping on (node).type properties
    (facets, loaded on view index.jade page load)
  */
  types: {
    resources: [
      'external-text',
      'picture',
      'press',
      'video',
      'cartoon',
      'facts',
      'letter',
      'facsimile',
      'treaty',
      'sound',
      'table',
      'article',
      'schema',
      'map',
      'graphical-table',
      'scientific-contribution',
      'passport'
    ],
    entity: [
      'theme',
      'location',
      'place',
      'person'
    ],
    // precomputate jaccard distance for these entities only (create appear_in_same_document neo4j links)
    jaccard: [
      'theme',
      'person'
    ]
  },
  
  /*

    list of suppported languages

  */
  languages: [
    'en',
    'fr',
    'de',
  ],
  

  /*
    Imagemagick support

    Enable image magick support only if imagemagick CLI are available.
    Test that everything works smoothly with

      mocha -g 'helpers: images'
  
  */
  imagemagick: false,
  /*

    Reference values for some variable
    
    1. trustworthiness: number of language * number of distinct services  

  */
  referenceValues: {
    trustworthiness: 3
  },
  
  yagoaida: {
    endpoint: 'https://gate.d5.mpi-inf.mpg.de/aida/service/disambiguate' 
  },
  
  dbpedia: {
    endpoint: 'http://dbpedia.org/data/',
    lookup: {
      endpoint: 'http://lookup.dbpedia.org/api/search.asmx/PrefixSearch'
    }
  },
  
  viaf: {
    endpoint: 'http://www.viaf.org/viaf/',
    format: 'viaf.xml',
    autosuggest: {
      endpoint: 'http://www.viaf.org/viaf/AutoSuggest'
    },
    links:{
      endpoint: 'http://www.viaf.org/viaf/'
    }
  },

  /*
    service for the endpoint:
    https://www.wikidata.org/wiki/Special:EntityData/Q789848.json
  */
  wikidata: {
    entity: {
      endpoint: 'https://www.wikidata.org/wiki/Special:EntityData/'
    }
  },
  
  geonames : {
    endpoint: 'http://api.geonames.org/searchJSON',
    username: '...'
  },
  /*
    google geocoding api, cfr https://developers.google.com/maps/documentation/geocoding/intro
    Users of the free API:
      2500 requests per 24 hour period.
      5 requests per second.
  */
  geocoding: { // google geocoding api
    endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
    key: '...'
  },
  /*
    Textrazor service 
    uncomment to abilitate textrazor with your textrazor account.
    Extractors: a list of extractors given as array, cfr textrazor documentation.
  */
  // textrazor: {
  //   key: 'xyzxxxxxxxxxxxxxxxxx',
  //   endpoint: 'https://api.textrazor.com',
  //   extractors: ['entities']
  // },
  
  /*
    Twitter Authentication method (with node passport)
    if you wish to authenticate people with their twitter account
  */ 
  twitter: {
    consumer_key: 'XWY',
    consumer_secret: 'XxYyZz'
  },
  
  /*
    Google+ Authentication method (with node passport)
    if you wish to authenticate people with their google account
  */ 
  google: { 
    clientId: "xzy.apps.googleusercontent.com",
    clientSecret: "xxx000"
  },
  
  /*
    Refine here the task that would be available through node scripts/manage.js task manager.
  */ 
   availableTasks: {
    'cartoDB': [
      'tasks.resource.cartoDB',
      'tasks.helpers.csv.stringify'
    ],
    'discover-entities': [
      'tasks.entity.discoverMany'
    ],
    
    'import-resources': [
      'tasks.helpers.csv.parse',
      'tasks.helpers.marvin.create',
      'tasks.resource.importData',
      'tasks.helpers.marvin.remove'
    ]
  }
  
};