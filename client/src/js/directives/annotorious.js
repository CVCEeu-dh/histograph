'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
angular.module('histograph')
  .directive('annotorious', function() {
    return {
      restrict : 'A',
      scope: {
        width: '=w',
        height: '=h',
        version: '=' // which annotation version do you want to see here?
      },
      link : function(scope, element) {
        element.bind("load" , function(e){ 
          anno.makeAnnotatable(this);
          console.log(scope.version, this.src, scope.height, scope.width);
          // reconcile with entity, if possible.
          for(var i in scope.version.yaml) {
            var geometry = {
              x: scope.version.yaml[i].region.left/(+scope.width),
              y: scope.version.yaml[i].region.top/(+scope.height),
              
              width: 0.1,
              height: 0.1,
            };
            geometry.width = -geometry.x + scope.version.yaml[i].region.right/(+scope.width);
            geometry.height = -geometry.y + scope.version.yaml[i].region.bottom/(+scope.height);
            console.log(geometry)
            anno.addAnnotation({
              src: this.src,
              text : scope.version.yaml[i].identification,
              shapes : [{
                type : 'rect',
                geometry : geometry
              }]
            })
          }
        });


      }
    };
  });
