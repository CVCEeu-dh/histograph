/**

  Controller for allchemyAPI face tags
  ===
  
*/
var alchemyapi = require('alchemy-api'),
    settings = require('../settings');

module.exports = {
  imageFaceTags: {
    image: function(req, res) {
      res.json({ message: 'Bear created!' });
    },
    url: function(req, res) {
      console.log(settings.ALCHEMYAPI_KEY)
      res.json({ message: 'Bear created!' });
    }
  }
};