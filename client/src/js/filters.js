/**
 * @ngdoc filters
 * @name histograph.filters
 * @description
 * # core
 */
angular.module('histograph')
  /*
    given an object with start_date and end_date ISO object, understand the right stuff to use.
    Improved with momentjs.
    @param {start_date:YYYY-MM-dd, end_date:YYYY-MM-dd}
  */
  .filter('guessInterval', function() {
    return function(input) {
      var start_date = moment.utc(input.start_date),
          end_date   = moment.utc(input.end_date),
          days = end_date.diff(start_date, 'day'),
          result;
      if(start_date.isValid()) {
        if(days < 1)
          result = start_date.format('LL');
        else
          result = start_date.format('LL') +  ' — ' + end_date.format('LL');
        return result;
      } else return 'no date found';
    };
  })
  /*
    Add UIROuter current state stateParams to GRAMMAR labels.
    Cfr currentState listeners in FiltersCtrl controller (js/controllers/filters.js)
  */
  .filter('enrichWithStateParams', function() {
    return function(input, stateParams) {
      _.each(stateParams, function(d, k){
        input = input.replace(':'+k, d);  
      })
      return input
    } 
  })
  /*
    Transform ECMD categories into human readable ones (if any) _PRESS 
  */
  .filter('ecmd', function() {
    return function (input) {
      if(!input || !input.length) {
        return '';
      }
      var categories = {
        ECMD_PRESS : 'press'
      }
      return categories[input] || input.toLowerCase().replace('ecmd_', '').replace(/_/g, ' ');
    };
  })
  /*
    given an object with start_date and end_date ISO object,
    return the humanified delta between a second start_date end_date object.
    Improved with momentjs.
    @param input {start_date:YYYY-MM-dd, end_date:YYYY-MM-dd}
    @param compare {start_date:YYYY-MM-dd, end_date:YYYY-MM-dd}
  */
  .filter('guessDifference', function() {
    return function(input, compare) {
      moment.locale('en', {
        // customizations.
        relativeTime : {
          future : "%s after",
          past : "%s before",
          s : "some seconds",
          m : "one minute",
          mm : "%d minutes",
          h : "one hour",
          hh : "%d hours",
          d : "one day",
          dd : "%d days",
          M : "one month",
          MM : "%d months",
          y : "one year",
          yy : "%d years"
          },
      });

      var start_date_a = moment.utc(input.start_date),
          start_date_b = moment.utc(compare.start_date),
          delta = moment.duration(start_date_b.diff(start_date_a));
      
      if(!start_date_a.isValid() || !start_date_b.isValid())
        return 'no date';
      
      if(Math.abs(delta) < 1000 * 60) {
        return 'same date';
        
      }
      return delta.humanize(true);
    };
  })
  // filter items array by returning ONLY items that are int the compare list
  .filter('only', function() {
    return function(items, compare) {
      var filtered = [],
          ids = compare.map(function (d) {
            return d.id;
          });
      angular.forEach(items, function (d) {
        if(ids.indexOf(d.id) !== -1)
          filtered.push(d);
      });
      return filtered;
    };
  })
  // extract the first numeric path from a given string. Mostly used for ID in comment tags.
  .filter('idify', function() {
    return function(input) {
      return +input.match(/\d+/);
    };
  })
  // humanize filenames if needed, strip bogus .
  .filter('humanize', function() {
    return function(input) {
      
      return input.replace('_', ' ').replace(/\.\w+$/, '');
    };
  })
  // humanize filenames if needed, strip bogus .
  .filter('humanizeState', function() {
    return function(input) {
      if(!input)
        return '';
      return input.replace(/\./g, ' ');
    };
  })
  .filter('datesOfSomeone', function() {
    return function(props) {
      
      var start_date_a = moment.utc(props.birth_time, 'X'),
          start_date_b = moment.utc(props.death_time, 'X');
      
      return [
        '(', 
          // props.birth_place? props.birth_place + ', ': '',
          start_date_a.isValid()? start_date_a.format('ll'): ' ? ',
        ' — ',
          // props.death_place? props.death_place + ', ': '',
          start_date_b.isValid()? start_date_b.format('ll'): ' ... ',
        ')'
      ].join(''); // count years
    };
  })
  .filter('datesOfAPerson', function() {
    return function(birth_time,death_time) {
      
      var start_date_a = moment.utc(birth_time, 'X'),
          start_date_b = moment.utc(death_time, 'X'),
          delta = moment.duration(start_date_b.diff(start_date_a));
      
      return [
        '(', 
          start_date_a.isValid()? start_date_a.format('ll'): ' ? ',
        ' — ',
          start_date_b.isValid()? start_date_b.format('ll'): ' ... ',
        ')'
      ].join(''); // count years
    };
  })
  .filter('map', function() {
    return function(input, key) {
      if(!input) return '';
      return input.map(function (d) {
        return d[key];
      }).join(',');
    };
  })
  .filter('cutat', function() {
    return function(text, cutAt) {
      // cutat
      if(isNaN(cutAt) || text.length <= cutAt)
        return text;
      //trim the string to the maximum length
      var t = text.substr(0, cutAt);
      //re-trim if we are in the middle of a word
      t = text.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
      // if there is a cut at, we will strip the html
      return t;
    };
  })
  // according to language, give the title a real title
  .filter('title', function($sce) {
    return function(props, language, cutAt) {
      if(!props)
        return "";
      var primary = props['title_' + language],
          wrapper = function(text) {
            // cutat
            if(isNaN(cutAt))
              return $sce.trustAsHtml(text);
            //trim the string to the maximum length
            var t = text.substr(0, cutAt);
            //re-trim if we are in the middle of a word
            if(text.length > cutAt)
              t = t.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
            // if there is a cut at, we will strip the html
            return t;
          };
      
      if(primary)
        return wrapper(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return wrapper(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'Untitled';
      
      return wrapper(props['title_' + props.languages[0]]);
    };
  })
  // according to language, give the caption a real caption
  .filter('caption', function($sce) {
    return function(props, language, cutAt) {
      var primary = props['caption_' + language];
      
      var wrapper = function(text) {
        return $sce.trustAsHtml(text);
      };
      
      if(primary)
        return wrapper(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return wrapper(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'caption';
      
      return wrapper(props['caption_' + props.languages[0]]);
    };
  })
  
  // thanks to igreulich/angular-truncate
  .filter('truncate', function (){
    return function (text, length, end){
      if (text !== undefined){
        if (isNaN(length)){
          length = 10;
        }

        end = end || "...";

        if (text.length <= length || text.length - end.length <= length){
          return text;
        }else{
          return String(text).substring(0, length - end.length) + end;
        }
      }
    };
  })
  /*
    Translate
  */
  .filter('lookup', function() {
    return function(props, field, language, cutAt) {
      var __t = function(text) {// cutat
        if(typeof text != 'string')
          return text;
        if(isNaN(cutAt))
          return text;//$sce.trustAsHtml(text);
        //trim the string to the maximum length
        var t = text.substr(0, cutAt);
        //re-trim if we are in the middle of a word
        if(text.length > cutAt)
          t = t.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
        // if there is a cut at, we will strip the html
        return t;
      };

      if(!props)
        return props
      var content = props[field + '_' + language]
      if(content)
        return __t(content);
      else
        for(var i in props.languages) {
          content = props[field + '_' + props.languages[i]];
          if(content)
            return __t(content)
        }
        return __t(props[field]) || (field + ' not available');
    }
  })
  
  /*
    Return the correct field for annotation purposes.
  */
  .filter('annotate', function($sce) {
    return function(annotations, field, language, props) {
      var annotation = _.get(_.find(annotations, {language:language}), 'annotation'),
          extra = '',
          result = '';
      
      if(!annotation) {
        annotation = _.get(_.first(annotations), 'annotation');
        extra = ''; // something like not available in english
      }
      
      if(annotation[field]){
        result = extra + annotation[field];
      }
      if(!result.length && props) {
        result = props[field + '_' + _.first(props.languages)]
      }
      return result
    }
  })
  
  .filter('abstract', function($sce) {
    return function(props, language, cutAt) {
      var primary = props['abstract_' + language],
          wrapper = function(text) {
            // cutat
            if(isNaN(cutAt))
              return $sce.trustAsHtml(text);
            //trim the string to the maximum length
            var t = text.substr(0, cutAt);
            //re-trim if we are in the middle of a word
            if(text.length > cutAt)
              t = t.substr(0, Math.min(t.length, t.lastIndexOf(' '))) + ' ...';
            // if there is a cut at, we will strip the html
            return t;
          };
      
      if(primary)
        return wrapper(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return wrapper(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'abstract';
      
      return wrapper(props['abstract_' + props.languages[0]]);
    };
  })
  /**
    Return a valid url for the given mimetype and props.
    IT allows to handle localisation without changing the global language.
  */
  .filter('url', function($sce) {
    return function(props, language, cutAt) {
      if(props.mimetype == 'image')
        return 'media/' + props.url;
      
      if(!props.languages || !props.languages.length)
        return; // noty found...
      
      var primary = props['url_' + language ] || props[language + '_url'];
        // console.log('URL', props, primary)
      if(primary)
        return primary;
      
      return props['url_' + props.languages[0]] || props[props.languages[0] + '_url'];
    };
  })
  /*
    Return the html marked version of the field.
  */
  .filter('marked', function ($sce) {
    return function(text) {
      if(typeof text == 'string')
        return $sce.trustAsHtml(marked(text));
      else 
        return '';
    };
  });