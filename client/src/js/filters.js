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
      
      if(days < 1)
        result = start_date.format('LL')
      else
        result = start_date.format('LL') +  ' — ' + end_date.format('LL')
      return result;
    }
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
    }
  })
  // filter items array by returning ONLY items that are int the compare list
  .filter('only', function() {
    return function(items, compare) {
      var filtered = []
        ids = compare.map(function (d) {
          return d.id;
        });
      angular.forEach(items, function (d) {
        if(ids.indexOf(d.id) !== -1)
          filtered.push(d);
      })
      return filtered;
    }
  })
  // extract the first numeric path from a given string. Mostly used for ID in comment tags.
  .filter('idify', function() {
    return function(input) {
      
      return +input.match(/\d+/);
    }
  })
  // humanize filenames if needed, strip bogus .
  .filter('humanize', function() {
    return function(input) {
      
      return input.replace('_', ' ').replace(/\.\w+$/, '');
    }
  })
  .filter('datesOfAPerson', function() {
    return function(birth_time,death_time) {
      
      var start_date_a = moment.utc(birth_time, 'x'),
          start_date_b = moment.utc(death_time, 'x'),
          delta = moment.duration(start_date_b.diff(start_date_a));
      
      return [
        '(', 
          start_date_a.isValid()? start_date_a.format('ll'): ' ? ',
        ' — ',
          start_date_b.isValid()? start_date_b.format('ll'): ' ... ',
        ')'
      ].join(''); // count years
    }
  })
  .filter('map', function() {
    return function(input, key) {
      return input.map(function (d) {
        return d[key]
      }).join(',')
    }
  })
  // according to language, give the title a real title
  .filter('title', function($sce) {
    return function(props, language, cutAt) {
      var primary = props['title_' + language];
      
      if(primary)
        return $sce.trustAsHtml(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return $sce.trustAsHtml(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'Untitled';
      
      return $sce.trustAsHtml(props['title_' + props.languages[0]])
    }
  })
  // according to language, give the caption a real caption
  .filter('caption', function($sce) {
    return function(props, language, cutAt) {
      var primary = props['caption_' + language];
      
      var wrapper = function(text) {
        return $sce.trustAsHtml(text)
      };
      
      if(primary)
        return wrapper(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return wrapper(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'caption';
      
      return wrapper(props['caption_' + props.languages[0]])
    }
  })
  .filter('abstract', function($sce) {
    return function(props, language, cutAt) {
      var primary = props['abstract_' + language];
      
      var wrapper = function(text) {
        return $sce.trustAsHtml(text)
      };
      
      if(primary)
        return wrapper(primary);
      
      var defaultName = props.name;
      
      if(defaultName)
        return wrapper(defaultName);
      
      // return the first in another language
      if(!props.languages || !props.languages.length)
        return 'abstract';
      
      return wrapper(props['abstract_' + props.languages[0]])
    }
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
        return ''; // noty found...
      
      var primary = props[language + '_url'];
        
      if(primary)
        return primary;
      
      return 'txt/' + props[props.languages[0] + '_url']
    }
  })


