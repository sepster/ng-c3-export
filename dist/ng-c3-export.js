(function (angular) {

  angular.module('ngC3Export.config', [])
    .value('ngC3Export.config', {
      debug: true
    });

  angular.module('ngC3Export',
    [
      'ngC3Export.config'
    ]);

})(angular);

(function () {
  'use strict';

  angular
    .module('ngC3Export')
    .directive('exportChart', exportChartDirective);

  /** @ngInject */
  function exportChartDirective(StyleFactory, ExportService) {
    return {
      restrict: 'A',
      scope: {},
      controller: function ($scope) {
        $scope.config = {
          exportedFileName: "c3 chart"
        };
      },
      link: {
        post: function postLink(scope, element, attrs) {
          var $element = $(element);

          if (attrs.exportedFileName) {
            scope.config.exportedFileName = attrs.exportedFileName;
          }

          if(attrs.backgroundColor){
            scope.config.backgroundColor = attrs.backgroundColor;
          }

          if (attrs.chartElement && $('.savePNG').length) {
            $element = $(attrs.chartElement);
            ExportService.createChartImages($element, scope.config);
          } else {
            var linkEl = angular.element('<a class="savePNG"><i class="fa fa-download"></i></a>');
            $element.append(linkEl);
            linkEl.on('click', function () {
              ExportService.createChartImages($element, scope.config);
            });
          }
        }
      }
    };
  }

})();


(function () {
  'use strict';

  angular
    .module('ngC3Export')
    .factory('ExportService', function (StyleFactory) {
      return {
        createChartImages: createChartImages
      };

      function createChartImages (element,config) {
          var chartEl = $(element);
          var svgEl = $(element.find('svg')).first()[0];
          var svgCopyEl = angular.element(svgEl.outerHTML)[0];
          var canvasEl = angular.element('<canvas id="canvasOriginal"></canvas>')[0];
          var emptySvgEl = angular.element('<svg id="emptysvg" xmlns="http://www.w3.org/2000/svg" version="1.1" height="2" />')[0];
          var emptyCanvasEl = angular.element('<canvas id="canvasComputed"></canvas>')[0];

          $(svgCopyEl).find('defs').remove();

          canvasEl.width = chartEl.width();
          emptyCanvasEl.width = chartEl.width();
          canvasEl.height = chartEl.height();
          emptyCanvasEl.height = chartEl.height();

          var container = angular.element('<div class="c3" style="display: none;"></div>');
          element.append(container);
          container.append(canvasEl);
          container.append(emptyCanvasEl);
          container.append(emptySvgEl);
          container.append(svgCopyEl);

          exportSvgToCanvas(svgCopyEl, canvasEl);

          var canvasComputed = StyleFactory.exportStyles(canvasEl, emptyCanvasEl, svgCopyEl, emptySvgEl);

          exportSvgToCanvas(svgCopyEl, canvasComputed);
          var imageData = canvasToImage(canvasComputed, config.backgroundColor);

          exportCanvasToPng($('.savePNG'), canvasComputed, config.exportedFileName, imageData);

          canvasEl.remove();
          emptyCanvasEl.remove();
          emptySvgEl.remove();
          svgCopyEl.remove();
        }

      function exportSvgToCanvas(svg, canvas) {
        canvg(canvas, new XMLSerializer().serializeToString(svg));
      }

      function canvasToImage(canvas, backgroundColor) {
        var w = canvas.width;
        var h = canvas.height;
        var context = canvas.getContext("2d");
        var data;
        if (backgroundColor)
        {
          data = context.getImageData(0, 0, w, h);
          var compositeOperation = context.globalCompositeOperation;
          context.globalCompositeOperation = "destination-over";
          context.fillStyle = backgroundColor;
          context.fillRect(0, 0, w, h);
        }
        var imageData = canvas.toDataURL("png");
        if (backgroundColor)
        {
          context.clearRect (0, 0, w, h);
          context.putImageData(data, 0, 0);
          context.globalCompositeOperation = compositeOperation;
        }
        return imageData;
      }

      function exportCanvasToPng(linkEl,canvasEl, filename, imageData) {
        linkEl.attr('href', imageData)
          .attr('download', function () {
            return filename + '.png';
          });
      }

      function exportCanvasToImage(canvasComputed) {
        Canvas2Image.saveAsPNG(canvasComputed);
      }
    });
})();

(function () {
  'use strict';

  angular
    .module('ngC3Export')
    .factory('StyleFactory', function () {
      return {
        exportStyles: function (canvasOriginal, canvasComputed, svg, emptySvg) {
          var tree = [];
          var emptySvgDeclarationComputed = getComputedStyle(emptySvg);
          var allElements = traverse(svg, tree);
          var i = allElements.length;

          while (i--) {
            explicitlySetStyle(allElements[i],emptySvgDeclarationComputed);
          }

          return canvasComputed;
        }
      };

      function traverse(obj, tree) {
        tree.push(obj);
        if (obj.hasChildNodes()) {
          var child = obj.firstChild;
          while (child) {
            if (child.nodeType === 1 && child.nodeName != 'SCRIPT') {
              traverse(child, tree);
            }
            child = child.nextSibling;
          }
        }
        return tree;
      }

      function explicitlySetStyle(element, emptySvgDeclarationComputed) {
        var cSSStyleDeclarationComputed = getComputedStyle(element);
        var i, len, key, value;
        var computedStyleStr = "";
        for (i = 0, len = cSSStyleDeclarationComputed.length; i < len; i++) {
          key = cSSStyleDeclarationComputed[i];
          value = cSSStyleDeclarationComputed.getPropertyValue(key);
          if (value !== emptySvgDeclarationComputed.getPropertyValue(key)) {
            if ((key == 'visibility' && value == 'hidden') || (key == 'opacity' && value == '0')) {
              computedStyleStr += 'display: none;';
            } else {
              computedStyleStr += key + ":" + value + ";";
            }
          }
        }
        element.setAttribute('style', computedStyleStr);
      }
    });
})();

