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
        version: '=', // which annotation version do you want to see here?
      },
      link : function(scope, element) {
        /* draw the current annotation version */
        var src = '';
        /*
          draw the corresponding annotation to annotorious
        */
        var draw = function (ver) {
          anno.removeAll();
          console.log('drqw version', ver, src)
          for(var i in ver.yaml) {
            var geometry = {
              x: ver.yaml[i].region.left/(+scope.width),
              y: ver.yaml[i].region.top/(+scope.height),
              
              width: 0.1,
              height: 0.1,
            };
            geometry.width = -geometry.x + ver.yaml[i].region.right/(+scope.width);
            geometry.height = -geometry.y + ver.yaml[i].region.bottom/(+scope.height);
            console.log(geometry, ver.yaml[i].identification, src)
            anno.addAnnotation({
              src: src,
              text : ver.yaml[i].identification || '',
              shapes : [{
                type : 'rect',
                geometry : geometry
              }]
            })
          }

          if(ver.service == 'merged') {
            try {
              anno.addPlugin('Merge', {src: src});
            } catch(e){
              console.log(e)
            }
          }
        };


        scope.$watch('version', function (ver) {
          console.log(ver)
          if(!ver)
            return;
          console.log('versio', element)
          if(!element[0].complete) {
            src = element[0].src;
            element.bind("load" , function (e) { 
              anno.makeAnnotatable(this);
              draw(ver);
            });
          } else {
            src = element[0].src;
            anno.makeAnnotatable(element[0]);
            draw(ver)
          };
        });
      }
    };
  });
