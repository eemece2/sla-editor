(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.createSlicer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var createSlicer = require('mesh-slice-polygon');
//var slicer = createSlicer();

module.exports = createSlicer;

},{"mesh-slice-polygon":2}],2:[function(require,module,exports){
var vec3 = require('gl-vec3');
var Vec2 = require('vec2');
var Polygon = require('polygon');
var orient = require('robust-orientation')[2];

// enable webworker debugging
if (typeof self !== 'undefined' && !self.console) {
  self.console = {
    log : function(msg) {
      var args = [];
      Array.prototype.push.apply(args, arguments)
      self.postMessage({ name : 'debug', data: args });
    }
  };
}

function Vertex(x, y, z) {
  if (x instanceof Float32Array) {
    this.position = x;
  } else if (Array.isArray(x)) {
    this.position = vec3.fromValues(x[0], x[1], x[2]);
  } else {
    this.position = vec3.fromValues(x, y, z);
  }

  this.id = Vertex.id++;
}

Vertex.id = 0;

Vertex.toString = function(x, y, z) {
  if (x instanceof Float32Array) {
    return '(' + [x[0], x[1], x[2]].join(',') + ')'
  } else {
    if (!Array.isArray(x)) {
      x = [x, y, z];
    }
    return '(' + x.join(',') + ')'
  }
};

Vertex.prototype = {
  toString : function() {
    return Vertex.toString(this.position);
  }
};

function Triangle(a, b, c, normal) {
  this.verts = [a, b, c];
  this.normal = normal;

  this.sortByZ();
  this.id = Triangle.id++;
}

Triangle.id = 0;

Triangle.prototype.sortByZAscending = function(a, b) {
  return a.position[2] > b.position[2] ? -1 : 1;
};

Triangle.prototype.sortByZ = function() {
  // TODO SORT: reverse sort if milling/printing
  this.verts.sort(this.sortByZAscending);
};

Triangle.prototype.toString = function() {
  return '[' + this.id + ':' + [this.verts[0].id, this.verts[1].id, this.verts[2].id].join(',') + ']';
};

function ZPlane(sliceZ) {
  this.position = vec3.fromValues(0,0,sliceZ);
  this.normal = vec3.fromValues(0, 0, 1);
}

ZPlane.prototype.intersect = function(start, end) {
  var tmp = vec3.create();
  var num = vec3.dot(
    this.normal,
    vec3.subtract(
      tmp,
      this.position,
      start.position
    )
  );

  var line = vec3.subtract(
    tmp,
    end.position,
    start.position
  );

  var den = vec3.dot(this.normal,line);

  var res = num/den;
  if (!isNaN(res) && 0 <= res && res <= 1.0) {

    var isect = vec3.add(
      tmp,
      start.position,
      vec3.multiply(
        tmp,
        line,
        vec3.fromValues(res, res, res)
      )
    );

    return isect;
  }
};

function MeshSlicePolygon() {
  if (!(this instanceof MeshSlicePolygon)) {
    return new MeshSlicePolygon();
  }

  this.plane = new ZPlane(0)
  this.seenVerts = {};
  this.sharedTriangles = {};
  this.triangles = [];
  this.bounds = {
    max : [-Infinity, -Infinity, -Infinity],
    min : [Infinity, Infinity, Infinity]
  };

  this.groups = [];
  this.group = [];
}

MeshSlicePolygon.prototype.trackBounds = function(coords) {
  var bounds = this.bounds;

  for (var i = 0; i<3; i++) {
    if (coords[i] > bounds.max[i]) {
      bounds.max[i] = coords[i];
    }

    if (coords[i] < bounds.min[i]) {
      bounds.min[i] = coords[i];
    }
  }
};

MeshSlicePolygon.prototype.upsertVert = function(x, y, z) {
  var key = Vertex.toString(x, y, z);

  if (!this.seenVerts[key]) {
    this.seenVerts[key] = new Vertex(x, y, z);
    this.trackBounds(this.seenVerts[key].position);
  }

  return this.seenVerts[key];
}

MeshSlicePolygon.prototype.sharedTriangle = function(a, b, ignore) {
  var aa = this.sharedTriangles[a.id];
  var ab = this.sharedTriangles[b.id];
  if (aa && aa.length && ab && ab.length) {
    for (var i = 0; i<aa.length; i++) {
      var ai = aa[i];
      for (var j = 0; j<ab.length; j++) {
        if (ai.id === ab[j].id && ignore.indexOf(ai.id) === -1) {
          return ai;
        }
      }
    }
  }

  return false;
};

MeshSlicePolygon.prototype.addTriangle = function(a, b, c) {
  if (Array.isArray(a)) {
    b = a[1];
    c = a[2];
    a = a[0];
  }

  this.dirty = true;
  a = this.upsertVert(a[0], a[1], a[2]);
  b = this.upsertVert(b[0], b[1], b[2]);
  c = this.upsertVert(c[0], c[1], c[2]);

  var triangle = new Triangle(a, b, c);

  if (!this.sharedTriangles[a.id]) {
    this.sharedTriangles[a.id] = [triangle];
  } else {
    this.sharedTriangles[a.id].push(triangle);
  }

  if (!this.sharedTriangles[b.id]) {
    this.sharedTriangles[b.id] = [triangle];
  } else {
    this.sharedTriangles[b.id].push(triangle);
  }

  if (!this.sharedTriangles[c.id]) {
    this.sharedTriangles[c.id] = [triangle];
  } else {
    this.sharedTriangles[c.id].push(triangle);
  }

  this.triangles.push(triangle);
};

var sortShared = function(a, b) {
  return (a.id > b.id) ? -1 : 1;
};

var clean = function(v) {
  return Math.round(v * 10000)/10000;
}

var collinear = function(a, b, c) {
  return orient(a.toArray(), b.toArray(), c.toArray()) === 0;
};

var rotateArray = function(array, count) {
  var len = array.length >>> 0,
      count = count >> 0;

  Array.prototype.unshift.apply(array, Array.prototype.splice.call(array, count % len, len));
  return array;
};

MeshSlicePolygon.prototype.sort = function() {
  Object.keys(this.sharedTriangles).forEach(function(key) {
    this.sharedTriangles[key].sort(sortShared);
  }.bind(this));

  this.triangles.sort(function(a, b) {
    return (a.verts[0].position[2] < b.verts[0].position[2]) ? -1 : 1;
  });
};

var isectTests = [[0,1], [0, 2], [1, 2]];

MeshSlicePolygon.prototype.followIntersectionChain = function(tri, startTri) {
  this.group = [];
  var last = startTri;
  var sentinal = this.triangles.length*2
  while (tri && sentinal--) {

    this.seenTriangles[tri.id] = true;

    var isects = [], shared = null;
    for (var i=0; i<isectTests.length; i++) {
      var test = isectTests[i];
      var isect = this.plane.intersect(tri.verts[test[0]], tri.verts[test[1]])
      if (isect) {
        //console.log('isect', isect);
        var vert = new Vertex(isect[0], isect[1], isect[2]);
        vert.shared = test;


        isects.push(vert);

        shared = this.sharedTriangle(
          tri.verts[test[0]],
          tri.verts[test[1]],
          [tri.id, last, startTri]
        );

        if (shared) {

          this.group.push(
            new Vec2(isect[0], isect[1])
          );

          if (tri.id !== startTri) {
            break;
          }
        }
      }
    }

    if (shared) {
      last = tri.id;
      tri = shared;
    } else {
      if (this.group && this.group.length > 0) {
        this.group.push(this.group[0]);

        var poly = new Polygon(this.group);
        poly.clean();

        // var newPoly = [];
        // for (var i = 0; i<poly.points.length; i++) {
        //   var p = poly.point(i-1);
        //   var n = poly.point(i+1);
        //   var c = poly.point(i);
        //   newPoly.push(c);
        // }

        // poly.points = newPoly;


        // Rotate the array to start nearest the lowest extent
        var min = Vec2(this.bounds.min[0], this.bounds.min[1]);

        if (poly && poly.length) {
          var closestToMinIdx = 0;
          var closestToMinVal = min.subtract(poly.points[0], true).lengthSquared()
          for (var i=1; i<poly.points.length; i++) {
            var currentVal = min.subtract(poly.points[i], true).lengthSquared();
            if (currentVal < closestToMinVal) {
              closestToMinIdx = i;
              closestToMinVal = currentVal;
            }
          }

          rotateArray(poly.points, closestToMinIdx);
          this.groups.push(poly);
        }
        this.group = [];
      }

      break;
    }
  }

  if (sentinal <= 0) {
    console.error('infinite loop')
  }
};

MeshSlicePolygon.prototype.sortByAreaDescending = function(a, b) {
  return (Math.abs(a.area()) > Math.abs(b.area())) ? -1 : 1;
};

MeshSlicePolygon.prototype.slice = function(z) {
  this.plane.position[2] = z;

  if (this.dirty) {
    this.dirty = false;
    this.sort();
  }

  var l = this.triangles.length;
  this.groups = [];
  this.group = [];

  this.seenTriangles = {};
  while (l--) {
    var startTri = this.triangles[l].id;

    if (!this.seenTriangles[startTri]) {
      var triVerts = this.triangles[l].verts;

      if (triVerts[0].position[2] >= z) {
        this.followIntersectionChain(this.triangles[l], startTri);
      } else {
        break;
      }
    }
  }

  // Ensure the groups are ordered by area
  this.groups.sort(this.sortByAreaDescending);

  return this.groups;
};

MeshSlicePolygon.prototype.markHoles = function(hulls) {
  var holes = 0, i;
  if (hulls && hulls.length) {

    for (var i = 1; i<hulls.length; i++) {
      hulls[i].rewind(true);
    }

    hulls.sort(this.sortByAreaDescending);

    for (i = 1; i<hulls.length; i++) {

      var subject = hulls[i];
      for (var j = i; j>=0; j--) {
        var target = hulls[j];
        if (target.containsPolygon(subject)) {
          subject.isHole = !target.isHole;
          if (subject.isHole) {
            // subject.rewind(false);
          }
          break;
        }
      }
    }
  }
};

module.exports = MeshSlicePolygon;

},{"gl-vec3":14,"polygon":38,"robust-orientation":44,"vec2":45}],3:[function(require,module,exports){
module.exports = add;

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}
},{}],4:[function(require,module,exports){
module.exports = angle

var fromValues = require('./fromValues')
var normalize = require('./normalize')
var dot = require('./dot')

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
function angle(a, b) {
    var tempA = fromValues(a[0], a[1], a[2])
    var tempB = fromValues(b[0], b[1], b[2])
 
    normalize(tempA, tempA)
    normalize(tempB, tempB)
 
    var cosine = dot(tempA, tempB)

    if(cosine > 1.0){
        return 0
    } else {
        return Math.acos(cosine)
    }     
}

},{"./dot":11,"./fromValues":13,"./normalize":22}],5:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
function clone(a) {
    var out = new Float32Array(3)
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],6:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
function copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],7:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
    var out = new Float32Array(3)
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
}
},{}],8:[function(require,module,exports){
module.exports = cross;

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
},{}],9:[function(require,module,exports){
module.exports = distance;

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],10:[function(require,module,exports){
module.exports = divide;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    out[2] = a[2] / b[2]
    return out
}
},{}],11:[function(require,module,exports){
module.exports = dot;

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
},{}],12:[function(require,module,exports){
module.exports = forEach;

var vec = require('./create')()

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
function forEach(a, stride, offset, count, fn, arg) {
        var i, l
        if(!stride) {
            stride = 3
        }

        if(!offset) {
            offset = 0
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length)
        } else {
            l = a.length
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i] 
            vec[1] = a[i+1] 
            vec[2] = a[i+2]
            fn(vec, vec, arg)
            a[i] = vec[0] 
            a[i+1] = vec[1] 
            a[i+2] = vec[2]
        }
        
        return a
}
},{"./create":7}],13:[function(require,module,exports){
module.exports = fromValues;

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
function fromValues(x, y, z) {
    var out = new Float32Array(3)
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],14:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , angle: require('./angle')
  , fromValues: require('./fromValues')
  , copy: require('./copy')
  , set: require('./set')
  , add: require('./add')
  , subtract: require('./subtract')
  , multiply: require('./multiply')
  , divide: require('./divide')
  , min: require('./min')
  , max: require('./max')
  , scale: require('./scale')
  , scaleAndAdd: require('./scaleAndAdd')
  , distance: require('./distance')
  , squaredDistance: require('./squaredDistance')
  , length: require('./length')
  , squaredLength: require('./squaredLength')
  , negate: require('./negate')
  , inverse: require('./inverse')
  , normalize: require('./normalize')
  , dot: require('./dot')
  , cross: require('./cross')
  , lerp: require('./lerp')
  , random: require('./random')
  , transformMat4: require('./transformMat4')
  , transformMat3: require('./transformMat3')
  , transformQuat: require('./transformQuat')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , forEach: require('./forEach')
}
},{"./add":3,"./angle":4,"./clone":5,"./copy":6,"./create":7,"./cross":8,"./distance":9,"./divide":10,"./dot":11,"./forEach":12,"./fromValues":13,"./inverse":15,"./length":16,"./lerp":17,"./max":18,"./min":19,"./multiply":20,"./negate":21,"./normalize":22,"./random":23,"./rotateX":24,"./rotateY":25,"./rotateZ":26,"./scale":27,"./scaleAndAdd":28,"./set":29,"./squaredDistance":30,"./squaredLength":31,"./subtract":32,"./transformMat3":33,"./transformMat4":34,"./transformQuat":35}],15:[function(require,module,exports){
module.exports = inverse;

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
function inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  out[2] = 1.0 / a[2]
  return out
}
},{}],16:[function(require,module,exports){
module.exports = length;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],17:[function(require,module,exports){
module.exports = lerp;

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}
},{}],18:[function(require,module,exports){
module.exports = max;

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    return out
}
},{}],19:[function(require,module,exports){
module.exports = min;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    return out
}
},{}],20:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}
},{}],21:[function(require,module,exports){
module.exports = negate;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
function negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    out[2] = -a[2]
    return out
}
},{}],22:[function(require,module,exports){
module.exports = normalize;

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}
},{}],23:[function(require,module,exports){
module.exports = random;

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
function random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
},{}],24:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateX(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]

    //perform rotation
    r[0] = p[0]
    r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c)
    r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c)

    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]

    return out
}
},{}],25:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateY(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c)
    r[1] = p[1]
    r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c)
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],26:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateZ(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c)
    r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c)
    r[2] = p[2]
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],27:[function(require,module,exports){
module.exports = scale;

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
function scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    out[2] = a[2] * b
    return out
}
},{}],28:[function(require,module,exports){
module.exports = scaleAndAdd;

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
function scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    out[2] = a[2] + (b[2] * scale)
    return out
}
},{}],29:[function(require,module,exports){
module.exports = set;

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
function set(out, x, y, z) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],30:[function(require,module,exports){
module.exports = squaredDistance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return x*x + y*y + z*z
}
},{}],31:[function(require,module,exports){
module.exports = squaredLength;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return x*x + y*y + z*z
}
},{}],32:[function(require,module,exports){
module.exports = subtract;

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}
},{}],33:[function(require,module,exports){
module.exports = transformMat3;

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2]
    out[0] = x * m[0] + y * m[3] + z * m[6]
    out[1] = x * m[1] + y * m[4] + z * m[7]
    out[2] = x * m[2] + y * m[5] + z * m[8]
    return out
}
},{}],34:[function(require,module,exports){
module.exports = transformMat4;

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
},{}],35:[function(require,module,exports){
module.exports = transformQuat;

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
function transformQuat(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    return out
}
},{}],36:[function(require,module,exports){
/*  Ported from Mukesh Prasad's public domain code:
 *    http://tog.acm.org/resources/GraphicsGems/gemsii/xlines.c
 *
 *   This function computes whether two line segments,
 *   respectively joining the input points (x1,y1) -- (x2,y2)
 *   and the input points (x3,y3) -- (x4,y4) intersect.
 *   If the lines intersect, the return value is an array
 *   containing coordinates of the point of intersection.
 *
 *   Params
 *        x1, y1,  x2, y2   Coordinates of endpoints of one segment.
 *        x3, y3,  x4, y4   Coordinates of endpoints of other segment.
 *
 *   Also Accepts:
 *    4 objects with the minimal object structure { x: .., y: ..}
 *    4 arrays where [0] is x and [1] is y
 *
 *   The value returned by the function is one of:
 *
 *        undefined - no intersection
 *        array     - intersection
 *        true      - colinear
 */

function segseg(x1, y1, x2, y2, x3, y3, x4, y4) {

  if (arguments.length === 4) {
    var p1 = x1;
    var p2 = y1;
    var p3 = x2;
    var p4 = y2;

    // assume array [x, y]
    if (p1.length && p1.length === 2) {
      x1 = p1[0];
      y1 = p1[1];
      x2 = p2[0];
      y2 = p2[1];
      x3 = p3[0];
      y3 = p3[1];
      x4 = p4[0];
      y4 = p4[1];

    // assume object with obj.x and obj.y
    } else {
      x1 = p1.x;
      y1 = p1.y;
      x2 = p2.x;
      y2 = p2.y;
      x3 = p3.x;
      y3 = p3.y;
      x4 = p4.x;
      y4 = p4.y;
    }
  }


  var a1, a2, b1, b2, c1, c2; // Coefficients of line eqns.
  var r1, r2, r3, r4;         // 'Sign' values
  var denom, offset;          // Intermediate values
  var x, y;                   // Intermediate return values

  // Compute a1, b1, c1, where line joining points 1 and 2
  // is "a1 x  +  b1 y  +  c1  =  0".
  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = x2 * y1 - x1 * y2;

  // Compute r3 and r4.
  r3 = a1 * x3 + b1 * y3 + c1;
  r4 = a1 * x4 + b1 * y4 + c1;

  // Check signs of r3 and r4.  If both point 3 and point 4 lie on
  // same side of line 1, the line segments do not intersect.
  if ( r3 !== 0 && r4 !== 0 && ((r3 >= 0 && r4 >= 0) || (r3 < 0 && r4 < 0))) {
    return; // no intersection
  }


  // Compute a2, b2, c2
  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4;

  // Compute r1 and r2
  r1 = a2 * x1 + b2 * y1 + c2;
  r2 = a2 * x2 + b2 * y2 + c2;

  // Check signs of r1 and r2.  If both point 1 and point 2 lie
  // on same side of second line segment, the line segments do
  // not intersect.
  if (r1 !== 0 && r2 !== 0 && ((r1 >= 0 && r2 >= 0) || (r1 < 0 && r2 < 0))) {
    return; // no intersections
  }

  // Line segments intersect: compute intersection point.
  denom = a1 * b2 - a2 * b1;

  if ( denom === 0 ) {
    return true;
  }

  offset = denom < 0 ? - denom / 2 : denom / 2;

  x = b1 * c2 - b2 * c1;
  y = a2 * c1 - a1 * c2;

  return [
    ( x < 0 ? x : x ) / denom,
    ( y < 0 ? y : y ) / denom,
  ];
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = segseg;
}

if (typeof window !== 'undefined') {
  window.segseg = window.segseg || segseg;
}

},{}],37:[function(require,module,exports){
;(function inject(clean, precision, undef) {

  function Vec2(x, y) {
    if (!(this instanceof Vec2)) {
      return new Vec2(x, y);
    }

    if('object' === typeof x && x) {
      this.y = x.y || 0;
      this.x = x.x || 0;
      return;
    }

    this.x = Vec2.clean(x || 0);
    this.y = Vec2.clean(y || 0);
  }

  Vec2.prototype = {
    change : function(fn) {
      if (fn) {
        if (this.observers) {
          this.observers.push(fn);
        } else {
          this.observers = [fn];
        }
      } else if (this.observers) {
        for (var i=this.observers.length-1; i>=0; i--) {
          this.observers[i](this);
        }
      }

      return this;
    },

    ignore : function(fn) {
      if (this.observers) {
        var o = this.observers, l = o.length;
        while(l--) {
          o[l] === fn && o.splice(l, 1);
        }
      }
      return this;
    },

    // set x and y
    set: function(x, y, silent) {
      if('number' != typeof x) {
        silent = y;
        y = x.y;
        x = x.x;
      }
      if(this.x === x && this.y === y)
        return this;

      this.x = Vec2.clean(x);
      this.y = Vec2.clean(y);

      if(silent !== false)
        return this.change();
    },

    // reset x and y to zero
    zero : function() {
      return this.set(0, 0);
    },

    // return a new vector with the same component values
    // as this one
    clone : function() {
      return new Vec2(this.x, this.y);
    },

    // negate the values of this vector
    negate : function(returnNew) {
      if (returnNew) {
        return new Vec2(-this.x, -this.y);
      } else {
        return this.set(-this.x, -this.y);
      }
    },

    // Add the incoming `vec2` vector to this vector
    add : function(vec2, returnNew) {
      if (!returnNew) {
        this.x += vec2.x; this.y += vec2.y;
        return this.change();
      } else {
        // Return a new vector if `returnNew` is truthy
        return new Vec2(
          this.x + vec2.x,
          this.y + vec2.y
        );
      }
    },

    // Subtract the incoming `vec2` from this vector
    subtract : function(vec2, returnNew) {
      if (!returnNew) {
        this.x -= vec2.x; this.y -= vec2.y;
        return this.change();
      } else {
        // Return a new vector if `returnNew` is truthy
        return new Vec2(
          this.x - vec2.x,
          this.y - vec2.y
        );
      }
    },

    // Multiply this vector by the incoming `vec2`
    multiply : function(vec2, returnNew) {
      var x,y;
      if ('number' !== typeof vec2) { //.x !== undef) {
        x = vec2.x;
        y = vec2.y;

      // Handle incoming scalars
      } else {
        x = y = vec2;
      }

      if (!returnNew) {
        return this.set(this.x * x, this.y * y);
      } else {
        return new Vec2(
          this.x * x,
          this.y * y
        );
      }
    },

    // Rotate this vector. Accepts a `Rotation` or angle in radians.
    //
    // Passing a truthy `inverse` will cause the rotation to
    // be reversed.
    //
    // If `returnNew` is truthy, a new
    // `Vec2` will be created with the values resulting from
    // the rotation. Otherwise the rotation will be applied
    // to this vector directly, and this vector will be returned.
    rotate : function(r, inverse, returnNew) {
      var
      x = this.x,
      y = this.y,
      cos = Math.cos(r),
      sin = Math.sin(r),
      rx, ry;

      inverse = (inverse) ? -1 : 1;

      rx = cos * x - (inverse * sin) * y;
      ry = (inverse * sin) * x + cos * y;

      if (returnNew) {
        return new Vec2(rx, ry);
      } else {
        return this.set(rx, ry);
      }
    },

    // Calculate the length of this vector
    length : function() {
      var x = this.x, y = this.y;
      return Math.sqrt(x * x + y * y);
    },

    // Get the length squared. For performance, use this instead of `Vec2#length` (if possible).
    lengthSquared : function() {
      var x = this.x, y = this.y;
      return x*x+y*y;
    },

    // Return the distance betwen this `Vec2` and the incoming vec2 vector
    // and return a scalar
    distance : function(vec2) {
      var x = this.x - vec2.x;
      var y = this.y - vec2.y;
      return Math.sqrt(x*x + y*y);
    },

    // Convert this vector into a unit vector.
    // Returns the length.
    normalize : function(returnNew) {
      var length = this.length();

      // Collect a ratio to shrink the x and y coords
      var invertedLength = (length < Number.MIN_VALUE) ? 0 : 1/length;

      if (!returnNew) {
        // Convert the coords to be greater than zero
        // but smaller than or equal to 1.0
        return this.set(this.x * invertedLength, this.y * invertedLength);
      } else {
        return new Vec2(this.x * invertedLength, this.y * invertedLength);
      }
    },

    // Determine if another `Vec2`'s components match this one's
    // also accepts 2 scalars
    equal : function(v, w) {
      if (w === undef) {
        w = v.y;
        v = v.x;
      }

      return (Vec2.clean(v) === this.x && Vec2.clean(w) === this.y);
    },

    // Return a new `Vec2` that contains the absolute value of
    // each of this vector's parts
    abs : function(returnNew) {
      var x = Math.abs(this.x), y = Math.abs(this.y);

      if (returnNew) {
        return new Vec2(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Return a new `Vec2` consisting of the smallest values
    // from this vector and the incoming
    //
    // When returnNew is truthy, a new `Vec2` will be returned
    // otherwise the minimum values in either this or `v` will
    // be applied to this vector.
    min : function(v, returnNew) {
      var
      tx = this.x,
      ty = this.y,
      vx = v.x,
      vy = v.y,
      x = tx < vx ? tx : vx,
      y = ty < vy ? ty : vy;

      if (returnNew) {
        return new Vec2(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Return a new `Vec2` consisting of the largest values
    // from this vector and the incoming
    //
    // When returnNew is truthy, a new `Vec2` will be returned
    // otherwise the minimum values in either this or `v` will
    // be applied to this vector.
    max : function(v, returnNew) {
      var
      tx = this.x,
      ty = this.y,
      vx = v.x,
      vy = v.y,
      x = tx > vx ? tx : vx,
      y = ty > vy ? ty : vy;

      if (returnNew) {
        return new Vec2(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Clamp values into a range.
    // If this vector's values are lower than the `low`'s
    // values, then raise them.  If they are higher than
    // `high`'s then lower them.
    //
    // Passing returnNew as true will cause a new Vec2 to be
    // returned.  Otherwise, this vector's values will be clamped
    clamp : function(low, high, returnNew) {
      var ret = this.min(high, true).max(low);
      if (returnNew) {
        return ret;
      } else {
        return this.set(ret.x, ret.y);
      }
    },

    // Perform linear interpolation between two vectors
    // amount is a decimal between 0 and 1
    lerp : function(vec, amount) {
      return this.add(vec.subtract(this, true).multiply(amount), true);
    },

    // Get the skew vector such that dot(skew_vec, other) == cross(vec, other)
    skew : function() {
      // Returns a new vector.
      return new Vec2(-this.y, this.x);
    },

    // calculate the dot product between
    // this vector and the incoming
    dot : function(b) {
      return Vec2.clean(this.x * b.x + b.y * this.y);
    },

    // calculate the perpendicular dot product between
    // this vector and the incoming
    perpDot : function(b) {
      return Vec2.clean(this.x * b.y - this.y * b.x);
    },

    // Determine the angle between two vec2s
    angleTo : function(vec) {
      return Math.atan2(this.perpDot(vec), this.dot(vec));
    },

    // Divide this vector's components by a scalar
    divide : function(vec2, returnNew) {
      var x,y;
      if ('number' !== typeof vec2) {
        x = vec2.x;
        y = vec2.y;

      // Handle incoming scalars
      } else {
        x = y = vec2;
      }

      if (x === 0 || y === 0) {
        throw new Error('division by zero')
      }

      if (isNaN(x) || isNaN(y)) {
        throw new Error('NaN detected');
      }

      if (returnNew) {
        return new Vec2(this.x / x, this.y / y);
      }

      return this.set(this.x / x, this.y / y);
    },

    isPointOnLine : function(start, end) {
      return (start.y - this.y) * (start.x - end.x) ===
             (start.y - end.y) * (start.x - this.x);
    },

    toArray: function() {
      return [this.x, this.y];
    },

    fromArray: function(array) {
      return this.set(array[0], array[1]);
    },
    toJSON: function () {
      return {x: this.x, y: this.y};
    },
    toString: function() {
      return '(' + this.x + ', ' + this.y + ')';
    }
  };

  Vec2.fromArray = function(array) {
    return new Vec2(array[0], array[1]);
  };

  // Floating point stability
  Vec2.precision = precision || 8;
  var p = Math.pow(10, Vec2.precision);

  Vec2.clean = clean || function(val) {
    if (isNaN(val)) {
      throw new Error('NaN detected');
    }

    if (!isFinite(val)) {
      throw new Error('Infinity detected');
    }

    if(Math.round(val) === val) {
      return val;
    }

    return Math.round(val * p)/p;
  };

  Vec2.inject = inject;

  if(!clean) {
    Vec2.fast = inject(function (k) { return k; });

    // Expose, but also allow creating a fresh Vec2 subclass.
    if (typeof module !== 'undefined' && typeof module.exports == 'object') {
      module.exports = Vec2;
    } else {
      window.Vec2 = window.Vec2 || Vec2;
    }
  }
  return Vec2;
})();



},{}],38:[function(require,module,exports){

if (typeof require !== 'undefined') {
  var Vec2 = require('vec2');
  var segseg = require('segseg');
}

var PI = Math.PI;
var TAU = PI*2;
var toTAU = function(rads) {
  if (rads<0) {
    rads += TAU;
  }

  return rads;
};

var isArray = function (a) {
  return Object.prototype.toString.call(a) === "[object Array]";
}

var isFunction = function(a) {
  return typeof a === 'function';
}

var defined = function(a) {
  return typeof a !== 'undefined';
}


function Polygon(points) {
  if (points instanceof Polygon) {
    return points;
  }

  if (!(this instanceof Polygon)) {
    return new Polygon(points);
  }

  if (!Array.isArray(points)) {
    points = (points) ? [points] : [];
  }

  this.points = points.map(function(point) {
    if (Array.isArray(point)) {
      return Vec2.fromArray(point);
    } else if (!(point instanceof Vec2)) {
      if (typeof point.x !== 'undefined' &&
          typeof point.y !== 'undefined')
      {
        return Vec2(point.x, point.y);
      }
    } else {
      return point;
    }
  });
}

Polygon.prototype = {
  each : function(fn) {
    for (var i = 0; i<this.points.length; i++) {
      if (fn.call(this, this.point(i-1), this.point(i), this.point(i+1), i) === false) {
        break;
      }
    }
    return this;
  },

  point : function(idx) {
    var el = idx%(this.points.length);
    if (el<0) {
      el = this.points.length + el;
    }

    return this.points[el];
  },

  dedupe : function(returnNew) {
    var seen = {};
    // TODO: make this a tree
    var points = this.points.filter(function(a) {
      var key = a.x + ':' + a.y;
      if (!seen[key]) {
        seen[key] = true;
        return true;
      }
    });

    if (returnNew) {
      return new Polygon(points);
    } else {
      this.points = points;
      return this;
    }
  },

  remove : function(vec) {
    this.points = this.points.filter(function(point) {
      return point!==vec;
    });
    return this;
  },

  // Remove identical points occurring one after the other
  clean : function(returnNew) {
    var last = this.point(-1);

    var points = this.points.filter(function(a) {
      var ret = false;
      if (!last.equal(a)) {
        ret = true;
      }

      last = a;
      return ret;
    });

    if (returnNew) {
      return new Polygon(points);
    } else {
      this.points = points
      return this;
    }
  },

  winding : function() {
    return this.area() > 0;
  },

  rewind : function(cw) {
    cw = !!cw;
    var winding = this.winding();
    if (winding !== cw) {
      this.points.reverse();
    }
    return this;
  },

  area : function() {
    var area = 0;
    var first = this.point(0);

    this.each(function(prev, current, next, idx) {
      if (idx<2) { return; }

      var edge1 = first.subtract(current, true);
      var edge2 = first.subtract(prev, true);
      area += ((edge1.x * edge2.y) - (edge1.y * edge2.x));
    });

    return area/2;
  },

  closestPointTo : function(vec) {
    var points = [],
        l = this.points.length,
        dist = Infinity,
        found = null,
        foundIndex = 0,
        foundOnPoint = false,
        i;

    for (i=0; i<l; i++) {

      var a = this.point(i-1);
      var b = this.point(i);
      var ab = b.subtract(a, true);
      var veca = vec.subtract(a, true);
      var vecadot = veca.dot(ab);
      var abdot = ab.dot(ab);

      var t = Math.min(Math.max(vecadot/abdot, 0), 1);

      var point = ab.multiply(t).add(a);
      var length = vec.subtract(point, true).lengthSquared();

      if (length < dist) {
        found = point;
        foundIndex = i;
        foundOnPoint = t===0 || t===1;
        dist = length;
      }
    }

    found.prev = this.point(foundIndex-1);
    found.next = this.point(foundIndex+1);

    if (foundOnPoint) {
      found.current = this.point(foundIndex);
    }

    return found;
  },

  center : function() {
    // TODO: the center of a polygon is not the center of it's aabb.
    var aabb = this.aabb();
    return Vec2(aabb.x + aabb.w/2, aabb.y + aabb.h/2);
  },

  scale : function(amount, origin, returnTrue) {
    var obj = this;
    if (returnTrue) {
      obj = this.clone();
    }

    if (!origin) {
      origin = obj.center();
    }

    obj.each(function(p, c) {
      c.multiply(amount);
    });

    var originDiff = origin.multiply(amount, true).subtract(origin);

    obj.each(function(p, c) {
      c.subtract(originDiff);
    });

    return obj;
  },

  containsPoint : function(point) {
    var c = false;
    
    this.each(function(prev, current, next) {
      ((prev.y <= point.y && point.y < current.y) || (current.y <= point.y && point.y < prev.y))
        && (point.x < (current.x - prev.x) * (point.y - prev.y) / (current.y - prev.y) + prev.x)
        && (c = !c);
    });
    
    return c;
  },

  containsPolygon : function(subject) {
    if (isArray(subject)) {
      subject = new Polygon(subject);
    }

    for (var i=0; i<subject.points.length; i++) {
      if (!this.containsPoint(subject.points[i])) {
        return false;
      }
    }

    for (var i=0; i<this.points.length; i++) {
      var outer = this.line(i);
      for (var j=0; j<subject.points.length; j++) {
        var inner = subject.line(j);

        var isect = segseg(outer[0], outer[1], inner[0], inner[1]);
        if (isect && isect !== true) {
          return false;
        }
      }
    }

    return true;
  },


  aabb : function() {
    if (this.points.length<2) {
      return { x: 0, y : 0, w: 0, h: 0};
    }

    var xmin, xmax, ymax, ymin, point1 = this.point(1);

    xmax = xmin = point1.x;
    ymax = ymin = point1.y;

    this.each(function(p, c) {
      if (c.x > xmax) {
        xmax = c.x;
      }

      if (c.x < xmin) {
        xmin = c.x;
      }

      if (c.y > ymax) {
        ymax = c.y;
      }

      if (c.y < ymin) {
        ymin = c.y;
      }
    });

    return {
      x : xmin,
      y : ymin,
      w : xmax - xmin,
      h : ymax - ymin
    };
  },

  offset : function(delta) {

    var raw = [],
        ret = [],
        last = null,
        bisectors = [],
        rightVec = Vec2(1, 0);

    // Compute bisectors
    this.each(function(prev, current, next, idx) {
      var e1 = current.subtract(prev, true).normalize();
      var e2 = current.subtract(next, true).normalize();
      var ecross = e1.perpDot(e2);
      var length = delta / Math.sin(Math.acos(e1.dot(e2))/2);

      length = -length;
      var angleToZero = rightVec.angleTo(current.subtract(prev, true).normalize());

      var rads = prev.subtract(current, true).normalize().angleTo(
        next.subtract(current, true).normalize()
      )

      var bisector = Vec2(length, 0).rotate(angleToZero + rads/2);

      if (ecross < 0)
      {
        bisector.add(current);
      } else {
        bisector = current.subtract(bisector, true);
      }
      bisector.cornerAngle = rads;
      current.bisector = bisector;
      bisector.point = current;
      raw.push(bisector);
    });

    Polygon(raw).each(function(p, c, n, i) {

      var isect = segseg(c, c.point, n, n.point);

      if (isect && isect !== true) {
        // This means that the offset is self-intersecting
        // find where and use that as the current vec instead

        var isect2 = segseg(
          p,
          c,
          n,
          this.point(i+2)
        );

        if (isect2 && isect2 !== false) {
          isect = isect2;
        }

        this.remove(c);
        c.set(isect[0], isect[1]);

      }

      ret.push(c)
    });

    return Polygon(ret);

  },

  line : function(idx) {
    return [this.point(idx), this.point(idx+1)];
  },

  lines : function(fn) {
    var idx = 0;
    this.each(function(p, start, end) {
      fn(start, end, idx++);
    });

    return this;
  },

  selfIntersections : function() {
    var ret = [];

    // TODO: use a faster algorithm. Bentley–Ottmann is a good first choice
    this.lines(function(s, e, i) {
      this.lines(function(s2, e2, i2) {

        if (!s2.equal(e) && !s2.equal(s) && !e2.equal(s) && !e2.equal(e) && i+1 < i2) {
          var isect = segseg(s, e, s2, e2);
          // self-intersection
          if (isect && isect !== true) {
            var vec = Vec2.fromArray(isect);
            // TODO: wow, this is inneficient but is crucial for creating the
            //       tree later on.
            vec.s = i + (s.subtract(vec, true).length() / s.subtract(e, true).length())
            vec.b = i2 + (s2.subtract(vec, true).length() / s2.subtract(e2, true).length())

            ret.push(vec);
          }
        }
      });
    }.bind(this));
    return Polygon(ret);
  },

  pruneSelfIntersections : function() {
    var selfIntersections = this.selfIntersections();

    var belongTo = function(s1, b1, s2, b2) {
      return s1 > s2 && b1 < b2
    }

    var contain = function(s1, b1, s2, b2) {
      return s1 < s2 && b1 > b2;
    }

    var interfere = function(s1, b1, s2, b2) {
      return (s1 < s2 && s2 < b1 && b2 > b1) || (s2 < b1 && b1 < b2 && s1 < s2);
    }

    function Node(value) {
      this.value = value;
      this.children = [];
    }

    // TODO: create tree based on relationship operations

    var rootVec = this.point(0).clone();
    rootVec.s = 0;
    rootVec.b = (this.points.length-1) + 0.99;
    var root = new Node(rootVec);
    var last = root;
    var tree = [rootVec];
    selfIntersections.each(function(p, c, n) {
      console.log(
        'belongTo:', belongTo(last.s, last.b, c.s, c.b),
        'contain:', contain(last.s, last.b, c.s, c.b),
        'interfere:', interfere(last.s, last.b, c.s, c.b)
      );

      //if (!contain(1-last.s, 1-last.b, 1-c.s, 1-c.b)) {
        tree.push(c);
        last = c;
      //} else {
        // collect under children
      //}

    });

    var ret = [];

    if (tree.length < 2) {
      return ret;
    }

    tree.sort(function(a, b) {
      return a.s - b.s;
    });

    for (var i=0; i<tree.length; i+=2) {
      var poly = [];
      var next = (i<tree.length-1) ? tree[i+1] : null;

     if (next) {

        // collect up to the next isect
        for (var j = Math.floor(tree[i].s); j<=Math.floor(next.s); j++) {
          poly.push(this.point(j));
        }

        poly.push(next);
        poly.push(this.point(Math.floor(tree[i].b)));
      } else {
        poly.push(tree[i])
        for (var k = Math.floor(tree[i].s+1); k<=Math.floor(tree[i].b); k++) {
          poly.push(this.point(k));
        }
      }

      ret.push(new Polygon(poly));
    }
    return ret;
  },

  get length() {
    return this.points.length
  },

  clone : function() {
    var points = [];
    this.each(function(p, c) {
      points.push(c.clone());
    });
    return new Polygon(points);
  },

  rotate: function(rads, origin, returnNew) {
    origin = origin || this.center();

    var obj = (returnNew) ? this.clone() : this;

    return obj.each(function(p, c) {
      c.subtract(origin).rotate(rads).add(origin);
    });
  },

  translate : function(vec2, returnNew) {
    var obj = (returnNew) ? this.clone() : this;

    obj.each(function(p, c) {
      c.add(vec2);
    });

    return obj;
  },

  equal : function(poly) {
    var current = poly.length;

    while(current--) {
      if (!this.point(current).equal(poly.point(current))) {
        return false;
      }
    }
    return true;
  },


  containsCircle : function(x, y, radius) {
    var position = new Vec2(x, y);

    // Confirm that the x,y is inside of our bounds
    if (!this.containsPoint(position)) {
      return false;
    }

    var closestPoint = this.closestPointTo(position);

    if (closestPoint.distance(position) >= radius) {
      return true;
    }
  },

  contains : function(thing) {

    if (!thing) {
      return false;
    }

    // Other circles
    if (defined(thing.radius) && thing.position) {
      var radius;
      if (isFunction(thing.radius)) {
        radius = thing.radius();
      } else {
        radius = thing.radius;
      }

      return this.containsCircle(thing.position.x, thing.position.y, radius);

    } else if (typeof thing.points !== 'undefined') {

      var points, l;
      if (isFunction(thing.containsPolygon)) {
        points = thing.points;
      } else if (isArray(thing.points)) {
        points = thing.points;
      }

      return this.containsPolygon(points);

    } else if (
      defined(thing.x1) &&
      defined(thing.x2) &&
      defined(thing.y1) &&
      defined(thing.y2)
    ) {
      return this.containsPolygon([
        new Vec2(thing.x1, thing.y1),
        new Vec2(thing.x2, thing.y1),
        new Vec2(thing.x2, thing.y2),
        new Vec2(thing.x1, thing.y2)
      ]);

    } else if (defined(thing.x) && defined(thing.y)) {

      var x2, y2;

      if (defined(thing.w) && defined(thing.h)) {
        x2 = thing.x+thing.w;
        y2 = thing.y+thing.h;
      }

      if (defined(thing.width) && defined(thing.height)) {
        x2 = thing.x+thing.width;
        y2 = thing.y+thing.height;
      }

      return this.containsPolygon([
        new Vec2(thing.x, thing.y),
        new Vec2(x2, thing.y),
        new Vec2(x2, y2),
        new Vec2(thing.x, y2)
      ]);
    }

    return false;
  }

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Polygon;
}

if (typeof window !== 'undefined') {
  window.Polygon = Polygon;
}

},{"segseg":36,"vec2":37}],39:[function(require,module,exports){
"use strict"

module.exports = fastTwoSum

function fastTwoSum(a, b, result) {
	var x = a + b
	var bv = x - a
	var av = x - bv
	var br = b - bv
	var ar = a - av
	if(result) {
		result[0] = ar + br
		result[1] = x
		return result
	}
	return [ar+br, x]
}
},{}],40:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var twoSum = require("two-sum")

module.exports = scaleLinearExpansion

function scaleLinearExpansion(e, scale) {
  var n = e.length
  if(n === 1) {
    var ts = twoProduct(e[0], scale)
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n)
  var q = [0.1, 0.1]
  var t = [0.1, 0.1]
  var count = 0
  twoProduct(e[0], scale, q)
  if(q[0]) {
    g[count++] = q[0]
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t)
    var pq = q[1]
    twoSum(pq, t[0], q)
    if(q[0]) {
      g[count++] = q[0]
    }
    var a = t[1]
    var b = q[1]
    var x = a + b
    var bv = x - a
    var y = b - bv
    q[1] = x
    if(y) {
      g[count++] = y
    }
  }
  if(q[1]) {
    g[count++] = q[1]
  }
  if(count === 0) {
    g[count++] = 0.0
  }
  g.length = count
  return g
}
},{"two-product":43,"two-sum":39}],41:[function(require,module,exports){
"use strict"

module.exports = robustSubtract

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = -f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = -f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],42:[function(require,module,exports){
"use strict"

module.exports = linearExpansionSum

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],43:[function(require,module,exports){
"use strict"

module.exports = twoProduct

var SPLITTER = +(Math.pow(2, 27) + 1.0)

function twoProduct(a, b, result) {
  var x = a * b

  var c = SPLITTER * a
  var abig = c - a
  var ahi = c - abig
  var alo = a - ahi

  var d = SPLITTER * b
  var bbig = d - b
  var bhi = d - bbig
  var blo = b - bhi

  var err1 = x - (ahi * bhi)
  var err2 = err1 - (alo * bhi)
  var err3 = err2 - (ahi * blo)

  var y = alo * blo - err3

  if(result) {
    result[0] = y
    result[1] = x
    return result
  }

  return [ y, x ]
}
},{}],44:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustScale = require("robust-scale")
var robustSubtract = require("robust-subtract")

var NUM_EXPAND = 5

var EPSILON     = 1.1102230246251565e-16
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("")
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  var args = []
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)))
    }
    args.push("m" + i)
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "orientation" + n + "Exact"
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("")
  var proc = new Function("sum", "prod", "scale", "sub", code)
  return proc(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3)
var orientation4Exact = orientation(4)

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0])
    var r = (a[0] - c[0]) * (b[1] - c[1])
    var det = l - r
    var s
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r)
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0]
    var bdx = b[0] - d[0]
    var cdx = c[0] - d[0]
    var ady = a[1] - d[1]
    var bdy = b[1] - d[1]
    var cdy = c[1] - d[1]
    var adz = a[2] - d[2]
    var bdz = b[2] - d[2]
    var cdz = c[2] - d[2]
    var bdxcdy = bdx * cdy
    var cdxbdy = cdx * bdy
    var cdxady = cdx * ady
    var adxcdy = adx * cdy
    var adxbdy = adx * bdy
    var bdxady = bdx * ady
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady)
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    var tol = ERRBOUND4 * permanent
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
]

function slowOrient(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateOrientationProc()
},{"robust-scale":40,"robust-subtract":41,"robust-sum":42,"two-product":43}],45:[function(require,module,exports){
;(function inject(clean, precision, undef) {

  var isArray = function (a) {
    return Object.prototype.toString.call(a) === "[object Array]";
  };

  var defined = function(a) {
    return a !== undef;
  };

  function Vec2(x, y) {
    if (!(this instanceof Vec2)) {
      return new Vec2(x, y);
    }

    if (isArray(x)) {
      y = x[1];
      x = x[0];
    } else if('object' === typeof x && x) {
      y = x.y;
      x = x.x;
    }

    this.x = Vec2.clean(x || 0);
    this.y = Vec2.clean(y || 0);
  }

  Vec2.prototype = {
    change : function(fn) {
      if (typeof fn === 'function') {
        if (this.observers) {
          this.observers.push(fn);
        } else {
          this.observers = [fn];
        }
      } else if (this.observers && this.observers.length) {
        for (var i=this.observers.length-1; i>=0; i--) {
          this.observers[i](this, fn);
        }
      }

      return this;
    },

    ignore : function(fn) {
      if (this.observers) {
        if (!fn) {
          this.observers = [];
        } else {
          var o = this.observers, l = o.length;
          while(l--) {
            o[l] === fn && o.splice(l, 1);
          }
        }
      }
      return this;
    },

    // set x and y
    set: function(x, y, notify) {
      if('number' != typeof x) {
        notify = y;
        y = x.y;
        x = x.x;
      }

      if(this.x === x && this.y === y) {
        return this;
      }

      var orig = null;
      if (notify !== false && this.observers && this.observers.length) {
        orig = this.clone();
      }

      this.x = Vec2.clean(x);
      this.y = Vec2.clean(y);

      if(notify !== false) {
        return this.change(orig);
      }
    },

    // reset x and y to zero
    zero : function() {
      return this.set(0, 0);
    },

    // return a new vector with the same component values
    // as this one
    clone : function() {
      return new (this.constructor)(this.x, this.y);
    },

    // negate the values of this vector
    negate : function(returnNew) {
      if (returnNew) {
        return new (this.constructor)(-this.x, -this.y);
      } else {
        return this.set(-this.x, -this.y);
      }
    },

    // Add the incoming `vec2` vector to this vector
    add : function(x, y, returnNew) {

      if (typeof x != 'number') {
        returnNew = y;
        if (isArray(x)) {
          y = x[1];
          x = x[0];
        } else {
          y = x.y;
          x = x.x;
        }
      }

      x += this.x;
      y += this.y;


      if (!returnNew) {
        return this.set(x, y);
      } else {
        // Return a new vector if `returnNew` is truthy
        return new (this.constructor)(x, y);
      }
    },

    // Subtract the incoming `vec2` from this vector
    subtract : function(x, y, returnNew) {
      if (typeof x != 'number') {
        returnNew = y;
        if (isArray(x)) {
          y = x[1];
          x = x[0];
        } else {
          y = x.y;
          x = x.x;
        }
      }

      x = this.x - x;
      y = this.y - y;

      if (!returnNew) {
        return this.set(x, y);
      } else {
        // Return a new vector if `returnNew` is truthy
        return new (this.constructor)(x, y);
      }
    },

    // Multiply this vector by the incoming `vec2`
    multiply : function(x, y, returnNew) {
      if (typeof x != 'number') {
        returnNew = y;
        if (isArray(x)) {
          y = x[1];
          x = x[0];
        } else {
          y = x.y;
          x = x.x;
        }
      } else if (typeof y != 'number') {
        returnNew = y;
        y = x;
      }

      x *= this.x;
      y *= this.y;

      if (!returnNew) {
        return this.set(x, y);
      } else {
        return new (this.constructor)(x, y);
      }
    },

    // Rotate this vector. Accepts a `Rotation` or angle in radians.
    //
    // Passing a truthy `inverse` will cause the rotation to
    // be reversed.
    //
    // If `returnNew` is truthy, a new
    // `Vec2` will be created with the values resulting from
    // the rotation. Otherwise the rotation will be applied
    // to this vector directly, and this vector will be returned.
    rotate : function(r, inverse, returnNew) {
      var
      x = this.x,
      y = this.y,
      cos = Math.cos(r),
      sin = Math.sin(r),
      rx, ry;

      inverse = (inverse) ? -1 : 1;

      rx = cos * x - (inverse * sin) * y;
      ry = (inverse * sin) * x + cos * y;

      if (returnNew) {
        return new (this.constructor)(rx, ry);
      } else {
        return this.set(rx, ry);
      }
    },

    // Calculate the length of this vector
    length : function() {
      var x = this.x, y = this.y;
      return Math.sqrt(x * x + y * y);
    },

    // Get the length squared. For performance, use this instead of `Vec2#length` (if possible).
    lengthSquared : function() {
      var x = this.x, y = this.y;
      return x*x+y*y;
    },

    // Return the distance betwen this `Vec2` and the incoming vec2 vector
    // and return a scalar
    distance : function(vec2) {
      var x = this.x - vec2.x;
      var y = this.y - vec2.y;
      return Math.sqrt(x*x + y*y);
    },

    // Convert this vector into a unit vector.
    // Returns the length.
    normalize : function(returnNew) {
      var length = this.length();

      // Collect a ratio to shrink the x and y coords
      var invertedLength = (length < Number.MIN_VALUE) ? 0 : 1/length;

      if (!returnNew) {
        // Convert the coords to be greater than zero
        // but smaller than or equal to 1.0
        return this.set(this.x * invertedLength, this.y * invertedLength);
      } else {
        return new (this.constructor)(this.x * invertedLength, this.y * invertedLength);
      }
    },

    // Determine if another `Vec2`'s components match this one's
    // also accepts 2 scalars
    equal : function(v, w) {
      if (typeof v != 'number') {
        if (isArray(v)) {
          w = v[1];
          v = v[0];
        } else {
          w = v.y;
          v = v.x;
        }
      }

      return (Vec2.clean(v) === this.x && Vec2.clean(w) === this.y);
    },

    // Return a new `Vec2` that contains the absolute value of
    // each of this vector's parts
    abs : function(returnNew) {
      var x = Math.abs(this.x), y = Math.abs(this.y);

      if (returnNew) {
        return new (this.constructor)(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Return a new `Vec2` consisting of the smallest values
    // from this vector and the incoming
    //
    // When returnNew is truthy, a new `Vec2` will be returned
    // otherwise the minimum values in either this or `v` will
    // be applied to this vector.
    min : function(v, returnNew) {
      var
      tx = this.x,
      ty = this.y,
      vx = v.x,
      vy = v.y,
      x = tx < vx ? tx : vx,
      y = ty < vy ? ty : vy;

      if (returnNew) {
        return new (this.constructor)(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Return a new `Vec2` consisting of the largest values
    // from this vector and the incoming
    //
    // When returnNew is truthy, a new `Vec2` will be returned
    // otherwise the minimum values in either this or `v` will
    // be applied to this vector.
    max : function(v, returnNew) {
      var
      tx = this.x,
      ty = this.y,
      vx = v.x,
      vy = v.y,
      x = tx > vx ? tx : vx,
      y = ty > vy ? ty : vy;

      if (returnNew) {
        return new (this.constructor)(x, y);
      } else {
        return this.set(x, y);
      }
    },

    // Clamp values into a range.
    // If this vector's values are lower than the `low`'s
    // values, then raise them.  If they are higher than
    // `high`'s then lower them.
    //
    // Passing returnNew as true will cause a new Vec2 to be
    // returned.  Otherwise, this vector's values will be clamped
    clamp : function(low, high, returnNew) {
      var ret = this.min(high, true).max(low);
      if (returnNew) {
        return ret;
      } else {
        return this.set(ret.x, ret.y);
      }
    },

    // Perform linear interpolation between two vectors
    // amount is a decimal between 0 and 1
    lerp : function(vec, amount, returnNew) {
      return this.add(vec.subtract(this, true).multiply(amount), returnNew);
    },

    // Get the skew vector such that dot(skew_vec, other) == cross(vec, other)
    skew : function(returnNew) {
      if (!returnNew) {
        return this.set(-this.y, this.x)
      } else {
        return new (this.constructor)(-this.y, this.x);
      }
    },

    // calculate the dot product between
    // this vector and the incoming
    dot : function(b) {
      return Vec2.clean(this.x * b.x + b.y * this.y);
    },

    // calculate the perpendicular dot product between
    // this vector and the incoming
    perpDot : function(b) {
      return Vec2.clean(this.x * b.y - this.y * b.x);
    },

    // Determine the angle between two vec2s
    angleTo : function(vec) {
      return Math.atan2(this.perpDot(vec), this.dot(vec));
    },

    // Divide this vector's components by a scalar
    divide : function(x, y, returnNew) {
      if (typeof x != 'number') {
        returnNew = y;
        if (isArray(x)) {
          y = x[1];
          x = x[0];
        } else {
          y = x.y;
          x = x.x;
        }
      } else if (typeof y != 'number') {
        returnNew = y;
        y = x;
      }

      if (x === 0 || y === 0) {
        throw new Error('division by zero')
      }

      if (isNaN(x) || isNaN(y)) {
        throw new Error('NaN detected');
      }

      if (returnNew) {
        return new (this.constructor)(this.x / x, this.y / y);
      }

      return this.set(this.x / x, this.y / y);
    },

    isPointOnLine : function(start, end) {
      return (start.y - this.y) * (start.x - end.x) ===
             (start.y - end.y) * (start.x - this.x);
    },

    toArray: function() {
      return [this.x, this.y];
    },

    fromArray: function(array) {
      return this.set(array[0], array[1]);
    },
    toJSON: function () {
      return {x: this.x, y: this.y};
    },
    toString: function() {
      return '(' + this.x + ', ' + this.y + ')';
    },
    constructor : Vec2
  };

  Vec2.fromArray = function(array, ctor) {
    return new (ctor || Vec2)(array[0], array[1]);
  };

  // Floating point stability
  Vec2.precision = precision || 8;
  var p = Math.pow(10, Vec2.precision);

  Vec2.clean = clean || function(val) {
    if (isNaN(val)) {
      throw new Error('NaN detected');
    }

    if (!isFinite(val)) {
      throw new Error('Infinity detected');
    }

    if(Math.round(val) === val) {
      return val;
    }

    return Math.round(val * p)/p;
  };

  Vec2.inject = inject;

  if(!clean) {
    Vec2.fast = inject(function (k) { return k; });

    // Expose, but also allow creating a fresh Vec2 subclass.
    if (typeof module !== 'undefined' && typeof module.exports == 'object') {
      module.exports = Vec2;
    } else {
      window.Vec2 = window.Vec2 || Vec2;
    }
  }
  return Vec2;
})();

},{}]},{},[1])(1)
});