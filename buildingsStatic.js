"use strict"

/**
 * @constructor
 */
function Buildings(gl, position)
{
    this.numVertices = 0;
    this.numEdgeVertices = 0;

    if (!gl)
        return;

    this.mapCenter = position;

    var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
    var physicalTileLength = earthCircumference* Math.cos(position.lat/180*Math.PI) / Math.pow(2, /*zoom=*/19);

/*
    var numTilesPer500m = 500 / physicalTileLength * 2; //HACK: increase radius to 1km

    var x = long2tile(position.lng,19);
    var y = lat2tile( position.lat,19);
    
    
    var lng_min = tile2long(x - numTilesPer500m, 19);
    var lng_max = tile2long(x + numTilesPer500m, 19);
    
    var lat_min = tile2lat( y + numTilesPer500m, 19);
    var lat_max = tile2lat( y - numTilesPer500m, 19);
*/
    
    
    var bldgs = this;
    var oReq = new XMLHttpRequest();
    oReq.onload = function() { bldgs.onDataLoaded(this); }
    oReq.open("get", "geometry.json", true);
    oReq.send();
    
}    

function vec(a) { return [a.dx, a.dy];}

/*
function simplifyOutline(outline)
{
    var nodes = outline.nodes;
    if (nodes.length < 3) return;

    var res = [];
    res[0] = nodes[0];
    var prev = nodes[0];
    var curr = nodes[1];
    for (var i = 2; i < nodes.length; i++)
    {
        var next = nodes[i];

        var v1 = norm2(sub2(vec(next), vec(curr)));   //v1 = norm( next - curr);
        var v2 = norm2(sub2(vec(prev), vec(curr)));   //v2 = norm( prev - curr);
        var cosArc = dot2(v1, v2);
        
        if (Math.abs(cosArc) > 0.999)    //almost colinear (deviation < 2.6°) --> ignore 'curr' vertex
        {
            curr = next;
            continue;
        }
        
        res.push(curr);
        prev = curr;
        curr = next;
    } 
    res.push(nodes[nodes.length-1]);


    // Handle edge case: vertex 0 lies on a colinear line segment and should be removed
    // N.B.: in OSM data, the first and last vertex of an area are identical.
    //       thus, the following algorithm skips the last vertex in the colinearity check
    //       and in case of colinearity removes the first *and* last vertex ( and 
    //       replicates the new first vertex as the new last one).

    
    prev = res[res.length-2];
    
    curr = res[0];
    next = res[1];
    
    var v1 = norm2(sub2(vec(next), vec(curr)));   //v1 = norm( next - curr);
    var v2 = norm2(sub2(vec(prev), vec(curr)));   //v2 = norm( prev - curr);
    var cosArc = dot2(v1, v2);
    
    if (Math.abs(cosArc) > 0.999)    //almost colinear (deviation < 2.6°) --> ignore 'curr' vertex
    {
        res = res.slice(1, res.length-1);
        res.push(res[0]);
    }    

    outline.nodes = res;
}
*/

/** standard polygon orientation test: 
  * 1. find a extreme vertex, e.g. the leftmost one
  * 2. determine the sign of opening angle between the adjacent edges (= the orientation)
  **/
function isClockwise(outline)
{
    var nodes = outline.nodes;
    if (nodes.length < 3) return;

    var minXIdx = 0;

    for (var i = 0; i < nodes.length; i++)
        if (nodes[i].dx < nodes[minXIdx].dx)
            minXIdx = i;
            
    //note: first and last vertex of a polygon are identical
    var predIdx = (minXIdx == 0) ? nodes.length - 2 : minXIdx - 1;
    var succIdx = (minXIdx == nodes.length-1) ? 1 : minXIdx + 1;
    
    var A = nodes[predIdx];
    var B = nodes[minXIdx];
    var C = nodes[succIdx];
    
    var det = (B.dx * C.dy + A.dx * B.dy + A.dy * C.dx) - (A.dy * B.dx + B.dy * C.dx + A.dx * C.dy);
    
    return det > 0;
}


Buildings.prototype.onDataLoaded = function(response) {
    var geometry = JSON.parse(response.responseText);
	
    //console.log(geometry);
    var lat = this.mapCenter.lat;
    var cosLat = Math.cos( lat/180 * Math.PI );
    
    var lng = this.mapCenter.lng;
    var earthCircumference = 2 * Math.PI * (6378.1 * 1000); // [m]

    for (var i in geometry)
    {    
        var building = geometry[i];
        
        var vertices = [];
        //convert vertices from lat/lng to local coordinate system (in meters)
        for (var j in building.vertices)
        {
            var v = building.vertices[j];
            var dLat = v[0] - lat;
            var dLng = v[1] - lng;
            
            var y = dLat/360 * earthCircumference;
            var x = dLng/360 * earthCircumference * cosLat;
            vertices.push([x, -y, v[2]]);
        }
        
        for (var j in building.edges)
        {
            var edge = building.edges[j];
            for (var j = 0; j < edge.length; j+= 1 )
                edge[j] = vertices[edge[j]];
        }

        for (var j in building.faces)
            building.faces[j] = vertices[building.faces[j]];
    }
    //console.log(geometry);            
    this.buildGlGeometry(geometry);
    
    if (this.onLoaded)
        this.onLoaded();
    
    //console.log("Buildings: %o", this.buildings);
}

/*
function getLengthInMeters(len_str) {
    // matches a float (including optional fractional part and optional 
    // exponent) followed by an optional unit of measurement
    var re = /^((\+|-)?\d+(\.\d+)?((e|E)-?\d+)?)\s*([a-zA-Z]*)?$/;
    var m = re.exec(len_str);
    if (!m)
    {
        console.log("cannot parse length string '" + len_str + "'");
        //fallback: if the string is not valid as a whole, let 
        //          JavaScript itself parse as much of it as possible
        return parseFloat(len_str); 
    }
    
    var val = parseFloat(m[1]);
    var unit= m[6];

    if (! unit) //no explicit unit --> unit is meters (OSM default)
        return val;
    
    if (unit == "m") //already in meters -> no conversion necessary
        return val; 

    console.log("unit is '" + unit + "'");
    if (console.warn)
        console.warn("no unit conversion performed");

    return val;
}*/

/* converts 'buildings' global coordinates (lat/lon) to local distances (in m) from mapCenter*/
/*function convertToLocalCoordinates(buildings,  mapCenter)
{
    var y0 = lat2tile(mapCenter.lat, 19);
    var x0 = long2tile(mapCenter.lng, 19);

    var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
    var physicalTileLength = earthCircumference* Math.cos(mapCenter.lat/180*Math.PI) / Math.pow(2, 19);

    for (var i in buildings)
    {
        var bld = buildings[i];
        for (var j = 0; j < bld.nodes.length; j++)
        {
            var y = lat2tile(bld.nodes[j].lat, 19);
            var x = long2tile(bld.nodes[j].lon, 19);
            
            bld.nodes[j].dx = (x - x0) * physicalTileLength;
            bld.nodes[j].dy = (y - y0) * physicalTileLength;
        }
    }
    return buildings;

}*/


Buildings.prototype.buildGlGeometry = function(geometry) {
    if (!gl)
        return;
        
        
    this.vertices= [];
    this.texCoords=[];
    this.normals  =[];
    this.edgeVertices = [];
    
    var vertexArrays = [];
    var texCoordArrays = [];

    for (var i in geometry)
    {
        var building = geometry[i];
        for (var j in building.edges)
        {
            var edge = building.edges[j];
            
            for (var k = 0; k < edge.length - 1; k++)
            {
                var edgeVertices = edge[k].concat(edge[k+1]);
                [].push.apply(this.edgeVertices, edgeVertices);
            }
        }
        
        for (var j = 0; j+2 < building.faces.length; j+=3)
        {
            var v1 = building.faces[j+0];
            var v2 = building.faces[j+1];
            var v3 = building.faces[j+2];
            
            var N = getNormal(v1, v2, v3);
            
            //flatten array of 3-element-arrays to a single array
            var coords = [].concat(v1, v2, v3);
            this.vertices.push.apply(this.vertices, coords);
            
            var tc = [0,0,1,  0,0,1,  0,0,1];
            this.texCoords.push.apply( this.texCoords, tc); //this 'hack' is way faster than concat()
            
            var norms = [].concat(N,N,N);
            this.normals.push.apply( this.normals, norms);
            
        }
    }
    //console.log("

    this.numVertices = this.vertices.length/3.0;    // 3 coordinates per vertex
    this.numEdgeVertices = this.edgeVertices.length/3.0;
    console.log("'Buildings' total to %s faces and %s edges", this.numVertices/3, this.numEdgeVertices/2);

    this.vertices = glu.createArrayBuffer(this.vertices);
    this.texCoords= glu.createArrayBuffer(this.texCoords);
    this.normals  = glu.createArrayBuffer(this.normals);
    this.edgeVertices = glu.createArrayBuffer(this.edgeVertices);
}

Buildings.prototype.renderDepth = function(modelViewMatrix, projectionMatrix) {
    if (! this.numVertices || !Shaders.ready)
        return;
        

    gl.enable(gl.CULL_FACE);
    //HACK: A building casts the same shadow regardless of whether its front of back faces are used in the shadow computation.
    //      The only exception is the building the camera is located in: using front faces would prevent light to be casted on
    //      anything inside the building walls, i.e. no light would fall on anything inside the apartment (since its windows
    //      have to corresponding holes in the buiding geometry. Using only the front faces effectively ignores just the
    //      building the camera is in for the shadow computation, which gives the desired effect to shading the apartment
    gl.cullFace(gl.FRONT);

	gl.useProgram(Shaders.depth);   //    Install the program as part of the current rendering state
	gl.enableVertexAttribArray(Shaders.depth.locations.vertexPosition); // setup vertex coordinate buffer

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(Shaders.depth.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    
    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);

	gl.uniformMatrix4fv(Shaders.depth.locations.modelViewProjectionMatrix, false, mvpMatrix);

    //gl.activeTexture(gl.TEXTURE0);  //successive commands (here 'gl.bindTexture()') apply to texture unit 0
    //gl.bindTexture(gl.TEXTURE_2D, null); //render geometry without texture
    
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);    

    gl.cullFace(gl.BACK);   //reset to normal behavior

}


Buildings.prototype.render = function(modelViewMatrix, projectionMatrix) {
    if ( !Shaders.ready)
        return;
        
    if (this.numVertices)
    {
        //draw faces
	    gl.useProgram(Shaders.building);   //    Install the program as part of the current rendering state
	    gl.enableVertexAttribArray(Shaders.building.locations.vertexPosition); // setup vertex coordinate buffer
	    gl.enableVertexAttribArray(Shaders.building.locations.vertexTexCoords); //setup texcoord buffer
	    gl.enableVertexAttribArray(Shaders.building.locations.vertexNormal); //setup texcoord buffer

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	    gl.vertexAttribPointer(Shaders.building.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
        
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords);
	    gl.vertexAttribPointer(Shaders.building.locations.vertexTexCoords, 3, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"

        // can apparently be -1 if the variable is not used inside the shader
        if (Shaders.building.locations.vertexNormal > -1)
        {
	        gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
	        gl.vertexAttribPointer(Shaders.building.locations.vertexNormal, 3, gl.FLOAT, false, 0, 0);  //assigns array "normals"
	    }

        var mvpMatrix = mat4.create();
        mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);

        gl.uniform1i(Shaders.building.locations.tex, 0); //select texture unit 0 as the source for the shader variable "tex" 
	    gl.uniformMatrix4fv(Shaders.building.locations.modelViewProjectionMatrix, false, mvpMatrix);

        var pos = Controller.localPosition;
        //console.log(pos.x, pos.y, pos.z);
        gl.uniform3f(Shaders.building.locations.cameraPos, pos.x, pos.y, pos.z);

        //gl.activeTexture(gl.TEXTURE0);  //successive commands (here 'gl.bindTexture()') apply to texture unit 0
        //gl.bindTexture(gl.TEXTURE_2D, null); //render geometry without texture
        
        gl.enable(gl.POLYGON_OFFSET_FILL);  //to prevent z-fighting between rendered edges and faces
        gl.polygonOffset(1,1);

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

        gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    // ===
    
    if (this.numEdgeVertices)
    {
        //step 2: draw outline
        gl.useProgram(Shaders.flat);   //    Install the program as part of the current rendering state
	    gl.enableVertexAttribArray(Shaders.flat.locations.vertexPosition); // setup vertex coordinate buffer

        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeVertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	    gl.vertexAttribPointer(Shaders.flat.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "edgeVertices" bound above as the vertex attribute "vertexPosition"

        var mvpMatrix = mat4.create();
        mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);
	    gl.uniformMatrix4fv(Shaders.flat.locations.modelViewProjectionMatrix, false, mvpMatrix);
	
	    gl.uniform4fv( Shaders.flat.locations.color, [0.2, 0.2, 0.2, 1.0]);
        //console.log("rendering %s edges", this.numEdgeVertices);
        gl.drawArrays(gl.LINES, 0, this.numEdgeVertices);
    }
}

