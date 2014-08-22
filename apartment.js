"use strict"

function Apartment(id, position, yaw, height) {

    this.textures = [];
    
    this.shaderProgram = glu.createShader(  document.getElementById("shadowed-shader-vs").text, 
                                            document.getElementById("shadowed-texture-shader-fs").text,
                                            ["vertexPosition", "normalIn", "vertexTexCoords"],
                                            ["modelViewProjectionMatrix", "sunDir", "shadowMatrix", "tex", "shadowTex"]);

    this.layoutId = id;
    this.layoutRequest = new XMLHttpRequest();
    this.layoutRequest.open("GET", OFFER_REST_BASE_URL + "/get/layoutMetadata/" + id);
    this.layoutRequest.responseType = "";
    //this.layoutRequest.apartment = this;
    var aptTmp = this;
    this.layoutRequest.onreadystatechange = function() 
    { 
        if (this.readyState != 4 || this.response == null)
            return;

        var tmp = aptTmp.loadLayout( JSON.parse(this.response), position, yaw, height);
        aptTmp.metadata = this.response;
        aptTmp.processLayout(tmp);
        
        if (aptTmp.onLoaded)
            aptTmp.onLoaded();
    }
    
    this.layoutRequest.send();
}

Apartment.prototype.render = function(modelViewMatrix, projectionMatrix, shadowMvpMatrix)
{
    if (!this.vertices)
        return;

    //As this tool is an apartment viewer, no other geometry is supposed to intersect with the apartment.
    //However, sometimes building geometry does intersect with the apartment geometry when the apartment is
    //ill-placed within the buiding.
    //Clearing the depth buffer before rendering the apartment ensures that this intersecting building geometry
    //Will be drawn over and this helps masking geometrical errors
	gl.clear(gl.DEPTH_BUFFER_BIT);

        
    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);

	gl.useProgram(this.shaderProgram);   //    Install the program as part of the current rendering state
	gl.uniformMatrix4fv(this.shaderProgram.locations.modelViewProjectionMatrix, false, mvpMatrix);
	gl.uniformMatrix4fv(this.shaderProgram.locations.shadowMatrix, false, shadowMvpMatrix);


    var sunDir = norm3(mapSun.getPosition());
	gl.uniform3fv(this.shaderProgram.locations.sunDir, sunDir);

    gl.uniform1i(this.shaderProgram.locations.tex, 0); //select texture unit 0 as the source for the shader variable "tex" 
    gl.uniform1i(this.shaderProgram.locations.shadowTex, 1); //select texture unit 1 as the source for the shader variable "shadowTex" 

	gl.enableVertexAttribArray(this.shaderProgram.locations.vertexPos); // setup vertex coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(this.shaderProgram.locations.vertexPos, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    
	gl.enableVertexAttribArray(this.shaderProgram.locations.vertexTexCoords); //setup texcoord buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords);
	gl.vertexAttribPointer(this.shaderProgram.locations.vertexTexCoords, 2, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"

	gl.enableVertexAttribArray(this.shaderProgram.locations.normalIn); //setup normal buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
	gl.vertexAttribPointer(this.shaderProgram.locations.normalIn, 3, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"


    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, Shadows.depthTexture);

    
	for (var i = 0; i < this.numVertices; i+=6)
	{
        gl.activeTexture(gl.TEXTURE0);				
        gl.bindTexture(gl.TEXTURE_2D, this.textures[i/6]);
	    gl.drawArrays(gl.TRIANGLES, i, 6);
    }
}
	
Apartment.prototype.renderDepth = function(modelViewMatrix, projectionMatrix)
{
    if (!this.vertices)
        return;

    //all apartment walls are only one-sided. This is fine for rendering, but for computing the shadow depths,
    //the away-facing wall segments also have to be considered
    gl.disable(gl.CULL_FACE);
        
    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);

	gl.useProgram(glu.depthShaderProgram);   //    Install the program as part of the current rendering state
	gl.uniformMatrix4fv(glu.depthShaderProgram.locations.modelViewProjectionMatrix, false, mvpMatrix);
    gl.uniform3fv(glu.depthShaderProgram.locations.lightPos, mapSun.getPosition());

	gl.enableVertexAttribArray(this.shaderProgram.locations.vertexPos); // setup vertex coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(this.shaderProgram.locations.vertexPos, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
        
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    gl.enable(gl.CULL_FACE);

}

			
			
Apartment.prototype.handleLoadedTexture = function(image) {

    if (this.textures[ image.id])
        gl.deleteTexture(this.textures[ image.id ] );
        
    this.textures[ image.id ] = glu.createTexture( image );
    if (Controller.onRequestFrameRender)
        Controller.onRequestFrameRender();
}

/* scoping hack: needs to be a dedicated function, because it is
 *               called within a loop over j. Without a dedicated function,
 *               the 'texture' and "j" variable would be shared between all 
 *               loop iterations, leading to the same texture being loaded 
 *               over and over again */
Apartment.prototype.requestTexture = function(layoutId, textureId, segmentData)
{

    //if texture was send as part of JSON geometry data, use it directly
    if (segmentData.texture !== undefined)
    {
        var image = new Image();
        image.id = textureId;
        image.apartment = this;
        image.onload = function() { this.apartment.handleLoadedTexture(image); };
        image.src = "data:image/png;base64," + segmentData.texture;
        return;        
    }


    var canvas = document.createElement('canvas');
    canvas.width  = 1;
    canvas.height = 1;
    var ctx = canvas.getContext("2d");
    
    var l = Math.floor((Math.random() * 256)).toString(16);
    ctx.fillStyle = "#"+l+l+l;
    //console.log("#"+r+g+b, ctx.fillStyle);
    
    ctx.fillRect( 0, 0, 1, 1 );    

    this.textures[ textureId] = glu.createTexture( canvas );


    var image = new Image();
    image.id = textureId;
    image.apartment = this;

    image.onload = function() { this.apartment.handleLoadedTexture(image); };

    /*image.src = "tiles/tile_"+j+".png"; */
    image.crossOrigin = "anonymous";
    image.src = OFFER_REST_BASE_URL + "/get/texture/" + layoutId + "/" + textureId;
}
			
/**
 *  creates the 3D GL geometry scene.
 */
Apartment.prototype.processLayout = function(segments)
{
    this.vertices = [];
    this.texCoords= [];
    this.normals  = [];
    for (var i in segments)
    {
        var seg = segments[i];
        /* D-C   
         * |/|
         * A-B  */
        var A = segments[i].pos;
        var w = segments[i].width;
        var B = [A[0]+w[0], A[1]+w[1], A[2]+w[2]];
        var h = segments[i].height;
        var C = [B[0]+h[0], B[1]+h[1], B[2]+h[2]];
        var D = [A[0]+h[0], A[1]+h[1], A[2]+h[2]];
        
        var verts = [].concat(A, B, C, /**/ A, C, D);
        [].push.apply(this.vertices, verts);
        
        var coords = [].concat([0,0], [1,0], [1,1], /**/ [0,0], [1,1], [0,1]);
        [].push.apply(this.texCoords, coords);
        
        var N = getNormal(A, B, C);
        [].push.apply(this.normals, [].concat(N, N, N, N, N, N) );
    }

    this.numVertices = (this.vertices.length / 3) | 0;
    
    this.vertices = glu.createArrayBuffer(this.vertices); //convert to webgl array buffer
    this.texCoords= glu.createArrayBuffer(this.texCoords);
    this.normals  = glu.createArrayBuffer(this.normals);
    
    for (var i = 0; i < this.numVertices/6; i++) {
        this.requestTexture(this.layoutId, i, segments[i]);
    }
	
    //renderScene();
}
			
function getAABB( segments)
{
    if (segments.length < 1) return [];
    var min_x = segments[0].pos[0];
    var max_x = segments[0].pos[0];
    var min_y = segments[0].pos[1];
    var max_y = segments[0].pos[1];
    
    for (var i in segments)
    {
        max_x = Math.max(max_x, segments[i].pos[0]);
        min_x = Math.min(min_x, segments[i].pos[0]);
        max_y = Math.max(max_y, segments[i].pos[1]);
        min_y = Math.min(min_y, segments[i].pos[1]);
        
        var x = segments[i].pos[0] + segments[i].width[0]; //width may be negative, so pos+width can
        var y = segments[i].pos[1] + segments[i].width[1]; //be smaller or larger than pos alone

        max_x = Math.max(max_x, x);
        min_x = Math.min(min_x, x);
        max_y = Math.max(max_y, y);
        min_y = Math.min(min_y, y);
    }
    
    return {"min_x":min_x, "max_x":max_x, "min_y":min_y, "max_y":max_y};
}


Apartment.prototype.loadLayout = function(responseJson, position, yaw, height)
{
        
    //console.log("request: %o", request);

    var segments = [];
    this.scale = responseJson.scale;
    this.startingPos = responseJson.geometry.startingPosition;
    this.startingPos[2] = 0;
    var rectangles = responseJson.geometry.geometry;

    for (var i in rectangles)
    {
        rectangles[i].pos[2] += height;
        segments.push(rectangles[i]);

    }
    
    //step 2: shift apartment to relocate its center to (0,0) to give its 'position' a canonical meaning
    var aabb = getAABB( segments);
    //var dx = aabb.max_x - aabb.min_x;
    //var dy = aabb.max_y - aabb.min_y;
    var mid_x = (aabb.max_x + aabb.min_x) / 2.0;
    var mid_y = (aabb.max_y + aabb.min_y) / 2.0;
    this.pixelShift = [mid_x, mid_y];

    for (var i in segments)
    {
        segments[i].pos[0] -= mid_x;
        segments[i].pos[1] -= mid_y;
    }    
    this.startingPos[0] -= mid_x;
    this.startingPos[1] -= mid_y;
   
    //step 3: rotate apartment;
    //console.log("apartment yaw is %s", yaw);
    for (var i in segments)
    {
        rotate( segments[i].pos, yaw);
        rotate( segments[i].width, yaw);
        rotate( segments[i].height, yaw);
    }
    rotate( this.startingPos, yaw);
    this.startingPos[1] = - this.startingPos[1];
    
    this.yawShift = yaw;
    
    //step 4: move to selected position
    var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
    var metersPerDegreeLat = earthCircumference / 360;
    var metersPerDegreeLng = metersPerDegreeLat * Math.cos( Controller.position.lat / 180 * Math.PI);

    var dx = (position.lng - Controller.position.lng) * metersPerDegreeLng;
    var dy = (position.lat - Controller.position.lat) * metersPerDegreeLat;

    this.worldShift = [dx, dy];
    //console.log("distance to apartment: dx=%sm, dy=%sm", dx, dy);
    for (var i in segments)
    {
        //FIXME: why do those signs have to be different?
        segments[i].pos[0] += dx;
        segments[i].pos[1] -= dy;
    }
    this.startingPos[0] +=dx;
    this.startingPos[1] -=dy;

    return segments;
}


Apartment.prototype.localToPixelCoordinates = function(localPosition)
{
    if (!mapApartment.worldShift || !mapApartment.pixelShift || mapApartment.yawShift === undefined)
        return [0,0];

    var pos = [];
    pos[0] =    localPosition.x - this.worldShift[0] ;
    pos[1] = - (localPosition.y - this.worldShift[1]);
    //console.log("After World Shift: %s", p1);


    rotate(pos, - mapApartment.yawShift);
    pos = add2(pos, mapApartment.pixelShift);
    pos[0] *= mapApartment.scale;
    pos[1] *= mapApartment.scale;

    return pos;
}

Apartment.prototype.pixelToLocalCoordinates = function(pixelPosition)
{
    if (!mapApartment.worldShift || !mapApartment.pixelShift || mapApartment.yawShift === undefined)
        return [0,0];

    pixelPosition[0] /= mapApartment.scale;
    pixelPosition[1] /= mapApartment.scale;
    pixelPosition = sub2(pixelPosition, mapApartment.pixelShift);
    rotate(pixelPosition, mapApartment.yawShift);

    return {
        "x":   pixelPosition[0] + this.worldShift[0],
        "y": - pixelPosition[1] + this.worldShift[1]
    }
}

