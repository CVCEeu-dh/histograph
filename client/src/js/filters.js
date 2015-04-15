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
      if(Math.abs(delta) < 1000 * 60) {
        return 'same date';
        
      }
      return delta.humanize(true);
    }
  });


