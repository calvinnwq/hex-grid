// InputError

function InputError(message) {
  this.message = message;
  this.stack = (new Error()).stack;
}
InputError.prototype = Object.create(Error.prototype);
InputError.prototype.name = "InputError";


// Hex

function Hex(q, r, s) {
  this.q = q;
  this.r = r;
  this.s = s || -q-r;
}
Hex.prototype.add = function(hex) {
  if (hex instanceof Hex) {
    return new Hex(this.q + hex.q, this.r + hex.r, this.s + hex.s);
  } else {
    throw new InputError("Invalid Hex Object: " + hex);
  }
}
Hex.prototype.subtract = function(hex) {
  if (hex instanceof Hex) {
    return new Hex(this.q - hex.q, this.r - hex.r, this.s - hex.s);
  } else {
    throw new InputError("Invalid Hex Object: " + hex);
  }
}
Hex.prototype.multiply = function(k) {
  return new Hex(this.q * k, this.r * k, this.s * k);
}
Hex.prototype.length = function(hex) {
  if (hex instanceof Hex) {
    return parseInt((Math.abs(hex.q) + Math.abs(hex.r) + Math.abs(hex.s)) / 2);
  } else {
    throw new InputError("Invalid Hex Object: " + hex);
  }
}
Hex.prototype.distance = function(hex) {
  if (hex instanceof Hex) {
    return this.length(this.subtract(hex));
  } else {
    throw new InputError("Invalid Hex Object: " + hex);
  }
}
Hex.prototype.isEqual = function(hex) {
  if (hex instanceof Hex) {
    return this.q == hex.q && this.r == hex.r && this.s == hex.s;
  } else {
    throw new InputError("Invalid Hex Object: " + hex);
  }
}


// Orientation

function Orientation(f0, f1, f2, f3, b0, b1, b2, b3, startAngle) {
  this.f0 = f0;
  this.f1 = f1;
  this.f2 = f2;
  this.f3 = f3;
  this.b0 = b0;
  this.b1 = b1;
  this.b2 = b2;
  this.b3 = b3;
  this.startAngle = startAngle;
}


// Layout

function Layout(orientation, size, origin) {
  this.orientation = orientation;
  this.size = size;
  this.origin = origin;
}


// Point

function Point(x, y) {
  this.x = x;
  this.y = y;
}


// HexGrid

function HexGrid() {
	this.markers = null;
	this.activePopups = null;
  this.layout = "pointy";
  this.originHex = new Hex(0, 0, 0);
  this.size = new Point(0.02, 0.02);
  this.origin = new Point(0, 0);
  this.lineOptions = {
    color: 'red',
    weight: 2,
    opacity: 1
  };
  this.orientations = {
    "pointy" : new Orientation(
      Math.sqrt(3.0), (Math.sqrt(3.0) / 2.0), 0.0, (3.0 / 2.0),
      (Math.sqrt(3.0) / 3.0), (-1.0 / 3.0), 0.0, (2.0 / 3.0),
      0.5
    ),
    "flat" : new Orientation(
      (3.0 / 2.0), 0.0, (Math.sqrt(3.0) / 2.0), Math.sqrt(3.0),
      (2.0 / 3.0), 0.0, (-1.0 / 3.0), (Math.sqrt(3.0) / 3.0),
      0.0
    )
  };
  this.layouts = {
    "pointy" : new Layout(this.orientations.pointy, this.size, this.origin),
    "flat" : new Layout(this.orientations.flat, this.size, this.origin)
  };
  this.directions = [
    new Hex(+1, -1,  0),
    new Hex(+1,  0, -1),
    new Hex(0, +1, -1),
    new Hex(-1, +1,  0),
    new Hex(-1,  0, +1),
    new Hex(0, -1, +1)
  ];
	this.markerIcons = {
		"point" : L.icon({
			iconUrl : 'assets/img/point.png'
		, iconSize : [16, 16]
		, iconAnchor : [8, 8]
		, shadowUrl : ''
		, shadowSize : [16, 16]
		, shadowAnchor : [8, 8]
		, popupAnchor : [0, 0]
		}),
		"ignore" : L.icon({
			iconUrl : 'assets/img/cross.png'
		, iconSize : [24, 24]
		, iconAnchor : [12, 12]
		, shadowUrl : ''
		, shadowSize : [24, 24]
		, shadowAnchor : [12, 12]
		, popupAnchor : [0, 0]
		})
	};
  this.map = L.map('map', {
		"center" : [0, 0],
    "zoom" : 12
	});
/*
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		attribution: ''
	}).addTo(this.map);
*/
}

HexGrid.prototype.dropMarker = function(hex, iconId) {
  var that = this;
  var iconId = iconId || 0;
  var markerPoint = that.hexToPixel(this.layout, hex);
	var marker = L.marker(markerPoint, {
		"icon" : that.markerIcons[iconId]
	}).addTo(that.map);
  that.addPopup(markerPoint, hex, iconId);
}

HexGrid.prototype.addPopup = function(latlng, hex, iconId) {
  var that = this;
  var popup = L.popup()
    .setLatLng(latlng)
    .setContent('<p class="'+iconId+'">'+hex.q+', '+hex.r+', '+hex.s+'</p>')
//    .setContent('<p class="'+iconId+'">'+value.q+', '+value.r+', '+value.s+'<br>'+latlng+'</p>')
    .openOn(that.map);
}

HexGrid.prototype.drawLine = function(hexA, hexB) {
  var that = this;
  var coordA = that.hexToPixel(this.layout, hexA);
  var coordB = that.hexToPixel(this.layout, hexB);
  var latlngs = [coordA, coordB];
  var polyline = L.polyline(latlngs, that.lineOptions).addTo(that.map);
}



HexGrid.prototype.hexDirection = function(direction) {
  if (!(0 <= parseInt(direction) && parseInt(direction) < 6)) {
    return null;
  }
  return this.directions[direction];
}

HexGrid.prototype.hexNeighbour = function(hex, direction) {
  return hex.add(this.hexDirection(direction));
}

HexGrid.prototype.hexNeighbours = function(hex) {
  var that = this;
  var neighbours = [];
  for (var i = 0; i < 6; i++) {
    var neighbour = this.hexNeighbour(hex, i);
    if (that.isPointValid(neighbour)) {
      neighbours.push(neighbour);
    }
  }
  return neighbours;
}

HexGrid.prototype.hexToPixel = function(layoutName, hex) {
  var layout = this.layouts[layoutName];
  var orientation = layout.orientation;
  var pointX = (orientation.f0 * hex.q + orientation.f1 * hex.r) * layout.size.x;
  var pointY = (orientation.f2 * hex.q + orientation.f3 * hex.r) * layout.size.y;
  return new L.LatLng(pointX + layout.origin.x, pointY + layout.origin.y);
}

HexGrid.prototype.getPointType = function(hex) {
  if (((hex.q - hex.r) % 3) === 0) {
    return "inverted-y";
  } else if (((hex.q - hex.r - 1) % 3) === 0) {
    return "y";
  } else {
    return "invalid";
  }
}

HexGrid.prototype.isPointValid = function(hex) {
  if (((hex.q - hex.r) % 3) === 0) {
    return true;
  } else if (((hex.q - hex.r - 1) % 3) === 0) {
    return true;
  } else {
    return false;
  }
}

HexGrid.prototype.generateSampleGrid = function(maxDistance) {
  var that = this;
  var distance = maxDistance || 2;
  var hexPoints = [];
  var processedPoints = [];
  var queue = that.hexNeighbours(new Hex(0, 0, 0));
  hexPoints.push(new Hex(0, 0, 0));
  processedPoints.push(new Hex(0, 0, 0));
  this.dropMarker(new Hex(0, 0, 0), "point");

  while (queue.length > 0) {
    var shifted = queue.shift();
    var pointDistance = this.originHex.distance(shifted);
    if (pointDistance <= maxDistance) {
      hexPoints.push(shifted);
      var tmpNeighbours = that.hexNeighbours(shifted);
      var filteredNeighbours = [];
      tmpNeighbours.forEach(function(value, index) {
        if (!containsObject(value, processedPoints)) {
          filteredNeighbours.push(value);
        }
      });
      processedPoints = processedPoints.concat(tmpNeighbours);
      queue = queue.concat(filteredNeighbours);
      this.dropMarker(shifted, "point");
    }
  }

  function containsObject(obj, list) {
    for (var j = 0; j < list.length; j++) {
      if (list[j].isEqual(obj)) {
        return true;
      }
    }
    return false;
  }

  function createPoint(hex) {
    return {
      coordinates: {x: hex.q, y: hex.r, z: hex.s},
      hasPlanet: true,
      planetId: 1
    };
  }
}

