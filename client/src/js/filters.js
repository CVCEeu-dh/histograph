/**
 * @ngdoc filters
 * @name histograph.filters
 * @description
 * # core
 */
angular.module('histograph')
  /*
     given an object with start_date and end_date ISO object, understand the right stuff to use.
    Improve it by using momentjs.
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
  });
