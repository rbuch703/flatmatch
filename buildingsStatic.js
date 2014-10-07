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
    this.geometry = [];
    this.numTilesLoaded = 0;

    var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
    var physicalTileLength = earthCircumference* Math.cos(position.lat/180*Math.PI) / Math.pow(2, /*zoom=*/19);


    //the building geometry tiles are created only for zoom level 14
    var x = long2tile(position.lng,14);
    var y = lat2tile( position.lat,14);

    var listX = x % 1 > 0.5 ? [0, 1] : [-1, 0];
    var listY = y % 1 > 0.5 ? [0, 1] : [-1, 0];
   
    x = Math.floor(x);
    y = Math.floor(y);

    var tiles = [];
    for (var i in listX)
        for (var j in listY)
            tiles.push( {x: x+listX[i], y: y+listY[j]} );
    
    
    for (i in tiles)
    {        
        var bldgs = this;
        var oReq = new XMLHttpRequest();
        oReq.onload = function() { bldgs.onDataLoaded(this); }
        //var url = "http://rbuch703.de/tiles/geo/"+tiles[i].x+"/"+tiles[i].y+".json"
        var url = "./geoTiles/"+tiles[i].x+"/"+tiles[i].y+".json"
//        console.log("requesting %s", url);
        oReq.overrideMimeType("text/plain");    //necessary to stop Firefox from logging a spurious error
        oReq.open("get", url, true);
        oReq.send();
    }
    
}    

//function vec(a) { return [a.dx, a.dy];}


/** standard polygon orientation test: 
  * 1. find a extreme vertex, e.g. the leftmost one
  * 2. determine the sign of opening angle between the adjacent edges (= the orientation)
  **/
/*function isClockwise(outline)
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
}*/


Buildings.prototype.onDataLoaded = function(response) {
    var geometry =  [].push.apply(this.geometry,JSON.parse(response.responseText));
	this.numTilesLoaded += 1;
	
	if (this.numTilesLoaded != 4)
	    return;
	
    //console.log(this.geometry);
    
    var lat = this.mapCenter.lat;
    var cosLat = Math.cos( lat/180 * Math.PI );
    
    var lng = this.mapCenter.lng;
    var earthCircumference = 2 * Math.PI * (6378.1 * 1000); // [m]
    
    for (var i in this.geometry)
    {    
        var building = this.geometry[i];
        var minHeight = building.minHeightInMeters | 0;
        
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
        
        // replace edge vertex IDs by actual edge vertices
        for (var j in building.edges)
        {
            var edge = building.edges[j];
            for (var j = 0; j < edge.length; j+= 1 )
                edge[j] = vertices[edge[j]];
        }

        // replace face vertex IDs by actual face vertices
        for (var j in building.faces)
            building.faces[j] = vertices[building.faces[j]];
            
        // process outlines: replace outline vertex IDs by actual vertices; 
        // construct drawable edges and faces form outlines
        for (var j in building.outlines)
        {
            var outline = building.outlines[j];
            var upper = [];
            var lower = [];
            for (var k in outline)
            {
                outline[k] = vertices[outline[k]];
                var vHigh = outline[k];
                var vLow  = [vHigh[0], vHigh[1], minHeight];
                upper.push( vHigh );
                lower.push( vLow );
                building.edges.push([vLow, vHigh]);
            }
            
            for (var k = 0; k < outline.length-1; k++)
            {
                var v4 = outline[k];
                var v3 = outline[k+1];
                var v2 = [v3[0], v3[1], minHeight];
                var v1 = [v4[0], v4[1], minHeight];
                building.faces.push(v1, v2, v3);
                building.faces.push(v1, v3, v4);
            }
            building.edges.push(upper);
            building.edges.push(lower);
            //console.log("%o", building);
        }

            
    }
    //console.log(geometry);            
    this.buildGlGeometry(this.geometry);

    delete this.geometry;
    
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
    //      have no corresponding holes in the building geometry. Using only the front faces effectively ignores just the
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

