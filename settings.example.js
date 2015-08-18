/**

  Config file
  ===
*/
module.exports = {
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