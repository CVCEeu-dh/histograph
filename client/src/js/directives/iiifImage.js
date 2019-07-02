/* eslint-env browser */
// eslint-disable-next-line no-undef
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback
  .directive('iiifImage', function directive() {
    return {
      restrict: 'A',
      scope: {
        url: '=iiifImage'
      },
      template: '<div class="iiif-image"></div>',
      link: function link(scope, element) {
        // eslint-disable-next-line no-var
        var root = element.find('.iiif-image')[0]

        /* global L */
        // eslint-disable-next-line no-var
        var map = L.map(root, {
          center: [0, 0],
          crs: L.CRS.Simple,
          zoom: 0,
          // scrollWheelZoom: false
        })

        L.tileLayer.iiif(scope.url).addTo(map)
      }
    }
  })
