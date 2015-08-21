/**

  Config file
  ===
*/
module.exports = {
  baseurl: '',
  
  secret: {
    cookie: 'cookie secret', // cookie salt
    salt: 'salt secret for password', // password salt
    activation: 'activation salt for activation link', // password salt
  },
  
  paths: {
    accesslog: './logs/access.log'
  },

  neo4j : {
    host: 'http://localhost:7474'
  },
  
  // list of resource fields to analyse.
  // note that the language will be appended.
  disambiguation: {
    fields: [
      'title',
      'caption',
    ],
    services: {
      'yagoaida': ['en']
    },
    geoservices: {
      'geonames': ['en', 'fr', 'de', 'nl'],
      'geocoding': ['en', 'fr', 'de', 'nl']
    },
    trustworthiness: [
      'services',
      'languages'
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
    format: 'viaf.xml'
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
    key: ''
  },
  /*
    Textrazor service 
    uncomment to abilitate textrazor with your textrazor account
  */
  // textrazor: {
  //   key: 'xyzxxxxxxxxxxxxxxxxx',
  //   endpoint: 'https://api.textrazor.com'
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
};