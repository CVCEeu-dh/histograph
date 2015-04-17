/**
  Very simple annotorious plugin to merge annotation rectangle in one powerful rectangle.
  This code is expecially obscure.
 * @param {Object=} options the config options
 */
annotorious.plugin.Merge = function(options) {
  /* return true if intersectiona rea is greater than */
  var annotations = anno.getAnnotations(),
      overlaps = {}, // key: annotation id, value: a list of annotation id that overlaps
      root_overlap = {},
      couples = ','; // we will add here couples of j'
  anno.removeAll();
  

  for (var i = 0; i < annotations.length; i++) {
    for(var j = i + 1; j < annotations.length; j++) {
      var intersection =  this.intersection(annotations[i].shapes[0].geometry, annotations[j].shapes[0].geometry);

      if(!overlaps[i])
        overlaps[i] = [];

      if(!intersection) { // no intersection between i and j
        continue;
      }

      if(root_overlap[j]) { // if J has already been involved in an overlap, then bind to the first image ever.
        overlaps[root_overlap[j]].push(j);
      } else { // that is, this is the first overlapping figure.
        root_overlap[j] = i;
        overlaps[i].push(j);
      }
    }
  }

  // cleaning overlap index that are already somewhere
  for(var i in overlaps)
    if(root_overlap[i])
      delete overlaps[i];

// draw standalone
  for (var index in overlaps) {
    if(!overlaps[index].length)
      anno.addAnnotation(annotations[index])
    else {
      annotations[index].text = 'merged';
      anno.addAnnotation(annotations[index])
    }

  }
  //onsole.log(overlaps, root_overlap)

}



annotorious.plugin.Merge.prototype.intersect = function(A, B) {
  return (Math.abs(A.x - B.x) * 2 < (A.width + B.width)) &&
         (Math.abs(A.y - B.y) * 2 < (A.height + B.height));
};

annotorious.plugin.Merge.prototype.intersection = function(A, B) {
  if (!this.intersect(A, B))
      return false;

  var I = {
    x: Math.max(A.x, B.x),
    y: Math.max(A.y, B.y),
  }

  I.width  = Math.min(A.x + A.width, B.x + B.width) - I.x;
  I.height = Math.min(A.y + A.height, B.y + B.height) - I.y;
  
  // console.log(A, B, I);
  // computate average area and check if it overlaps more than 80 % of the minimal area
  I.area = I.width * I.height;
  return I;
};

annotorious.plugin.Merge.prototype.initPlugin  = function(annotator) {
  console.log('test init plugin', anno.getAnnotations());
  // store annotations

  // clean annotations
}