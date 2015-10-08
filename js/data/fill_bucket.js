'use strict';

var Bucket = require('./bucket');
var util = require('../util/util');
var ElementGroups = require('./element_groups');
var earcut = require('earcut');
var classifyRings = require('../util/classify_rings');

module.exports = FillBucket;

function FillBucket() {
    Bucket.apply(this, arguments);
}

FillBucket.prototype = util.inherit(Bucket, {});

FillBucket.prototype.shaders = {
    fill: {
        vertexBuffer: true,
        elementBuffer: true,
        elementBufferComponents: 1,
        secondElementBuffer: true,
        secondElementBufferComponents: 2,

        attributeArgs: ['x', 'y'],

        attributes: [{
            name: 'pos',
            components: 2,
            type: Bucket.AttributeType.SHORT,
            value: ['x', 'y']
        }]
    }
};

FillBucket.prototype.addFeature = function(feature) {
    var lines = feature.loadGeometry();
    var polygons = classifyRings(convertCoords(lines));
    for (var i = 0; i < polygons.length; i++) {
        this.addPolygon(polygons[i]);
    }
};

FillBucket.prototype.addPolygon = function(polygon) {
    var numVertices = 0;
    for (var k = 0; k < polygon.length; k++) {
        numVertices += polygon[k].length;
    }

    var fillVertex = this.buffers.fillVertex,
        fillElement = this.buffers.fillElement,
        fillSecondElement = this.buffers.fillSecondElement,
        elementGroup = this.makeRoomFor('fill', numVertices),
        startIndex = fillVertex.length - elementGroup.vertexStartIndex,
        flattened = [],
        holeIndices = [],
        prevIndex;

    for (var r = 0; r < polygon.length; r++) {
        var ring = polygon[r];

        if (r > 0) holeIndices.push(flattened.length / 2);

        for (var v = 0; v < ring.length; v++) {
            var vertex = ring[v];

            var currentIndex = fillVertex.length - elementGroup.vertexStartIndex;
            this.addFillVertex(vertex[0], vertex[1]);

            if (v >= 1) {
                this.addFillSecondElement(prevIndex, currentIndex);
            }

            prevIndex = currentIndex;

            // convert to format used by earcut
            flattened.push(vertex[0]);
            flattened.push(vertex[1]);
        }
    }

    var triangleIndices = earcut(flattened, holeIndices);

    for (var i = 0; i < triangleIndices.length; i++) {
        this.addFillElement(triangleIndices[i] + startIndex);
    }
};

function convertCoords(rings) {
    var result = [];
    for (var i = 0; i < rings.length; i++) {
        var ring = [];
        for (var j = 0; j < rings[i].length; j++) {
            var p = rings[i][j];
            ring.push([p.x, p.y]);
        }
        result.push(ring);
    }
    return result;
}
