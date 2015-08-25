/*
  Data Generator
  ---
  Generate custom data for each module 'create' function mMainly used for mocha test
  Cfr test/models.*.js

*/
var should   = require('should');

module.exports = function(options) {
  return {
    
    entity: {
      social_group: function() {
        return {
          links_wiki: 'Yalta_Conference',
          type: 'social_group',
          name: 'Yalta_Conference',
          trustworthiness: 0.8
        }
      }  
    },
    
    resource: {
      multilanguage: function(properties) {
        return {
          name: 'another untitled',
          doi: 'automatic doi generation' + options.suffix,
          mimetype: 'text',
          title_en: "'Britain's Answer to M. Schuman' from The New Statesman and Nation (17 June 1950)",
          title_fr: "\"La réponse de la Grande-Bretagne à M. Schuman\" dans The New Statesman and Nation (17 juin 1950)",
          title_de: "\"Die Antwort Großbritanniens an Robert Schuman\" in The New Statesman and Nation (17. Juni 1950)",
          caption_en: "On 17 June 1950, the English weekly magazine The New Statesman and Nation reports on the British position towards the French plan for the pooling of coal and steel production in Western Europe.",
          caption_fr: "Le 17 juin 1950, l'hebdomadaire anglais The New Statesman and Nation expose la position britannique face au projet français de mise en commun des productions de l'acier et du charbon en Europe occidentale.",
          caption_de: "Am 17. Juni 1950 legt die englische Wochenzeitschrift The New Statesman and Nation die britische Haltung gegenüber dem französischen Plan der Zusammenlegung der Kohle- und Stahlproduktion in Westeuropa dar.",
          languages: ['en', 'fr', 'de'],
          user: properties.user
        }
      },
      multilanguageB: function(properties) {
        return {
          name: 'another untitled B',
          doi: 'automatic doi generation, B',
          mimetype: 'text',
          title_en: "'Yalta, from failure to myth' from Le Monde (5 February 1985)",
          title_fr: "\"Yalta, de l'échec au mythe\" dans Le Monde (5 février 1985)",
          title_de: "\"Jalta – vom Scheitern zum Mythos\" in Le Monde (5. Februar 1985)",
          caption_en: "From 4 to 11 February 1945, the Yalta Conference was attended by Winston Churchill, Franklin D. Roosevelt and Joseph Stalin who were to determine the future of Europe. Forty years on, André Fontaine questions the real significance of the Conference in an article published in the French daily newspaper Le Monde on 5 February 1985.",
          caption_fr: "Du 4 au 11 février 1945, la Conférence de Yalta réunit Winston Churchill, Franklin D. Roosevelt et Joseph Staline qui doivent décider du sort de l'Europe. Quarante ans plus tard, André Fontaine remet en question la portée effective de la conférence dans un article publié le 5 février 1985 dans le quotidien français Le Monde.",
          caption_de: "Vom 4. bis 11. Februar 1945 trafen sich Winston Churchill, Franklin D. Roosevelt und Joseph Staline auf der Konferenz von Jalta, um über das Schicksal Europas zu entscheiden. Vierzig Jahre später stellt André Fontaine die eigentliche Tragweite dieser Konferenz in einem am 5. Februar 1985 in der französischen Tageszeitung Le Monde veröffentlichten Artikel in Frage.",
          languages: ['en', 'fr', 'de'],
          user: properties.user
        }
      }
    },
    
    
    
    user: {
      guest: function() {
        return {
          username   : 'hello-world-for-' + options.suffix,
          password   : 'WorldHello',
          email      : 'test-model-' + options.suffix + '@globetrotter.it',
          firstname  : 'Milky',
          lastame    : 'Way',
          strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
          about      : ''
        }
      },
      
      admin: function() {
        return _.assign(module.exports.user.guest, {
          role : 'staff'
        });
      }
    },
    
    relationships: {
      
    }
  }
};