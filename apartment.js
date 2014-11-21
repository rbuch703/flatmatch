"use strict"

/**
 * @constructor
 */
function Apartment(id, scale, layout, yaw, height) {

    this.yawShift = yaw;
    this.heightOffset = height;

    this.textures = [];
    
    this.layoutId = id;
    
    this.scale = scale;
    this.startingPos = layout.startingPosition;
    this.startingPos[2] = 0;
        
    var walls = layout.geometry;
    var box   = layout.box;
    
    if (box == undefined)
        box = [];

    this.repositionGeometry(walls, box);
    this.buildGlGeometry(   walls, box);
}

Apartment.prototype.render = function(modelViewMatrix, projectionMatrix, shadowMvpMatrix)
{
    if (!this.vertices || !Shaders.ready)
        return;

    //As this tool is an apartment viewer, no other geometry is supposed to intersect with the apartment.
    //However, sometimes building geometry does intersect with the apartment geometry when the apartment is
    //ill-placed within the buiding.
    //Clearing the depth buffer before rendering the apartment ensures that this intersecting building geometry
    //Will be drawn over and this helps masking geometrical errors
	gl.clear(gl.DEPTH_BUFFER_BIT);

        
    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);
	gl.useProgram(Shaders.shadow);   //    Install the program as part of the current rendering state
	glu.enableVertexAttribArrays(Shaders.shadow);

	gl.uniformMatrix4fv(Shaders.shadow.locations.modelViewProjectionMatrix, false, mvpMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(Shaders.shadow.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    
	gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords);
	gl.vertexAttribPointer(Shaders.shadow.locations.vertexTexCoords, 2, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"


    if (glu.performShadowMapping)
    {
	    gl.uniformMatrix4fv(Shaders.shadow.locations.shadowMatrix, false, shadowMvpMatrix);


        var sunDir = norm3(mapSun.getPosition());
	    gl.uniform3fv(Shaders.shadow.locations.sunDir, sunDir);

        gl.uniform1i(Shaders.shadow.locations.tex, 0); //select texture unit 0 as the source for the shader variable "tex" 
        gl.uniform1i(Shaders.shadow.locations.shadowTex, 1); //select texture unit 1 as the source for the shader variable "shadowTex" 

	    gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
	    gl.vertexAttribPointer(Shaders.shadow.locations.normalIn, 3, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"


        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, Shadows.colorTexture);//.depthTexture);
    }
    
	for (var i = 0; i < this.numVertices; i+=6)
	{
        gl.activeTexture(gl.TEXTURE0);				
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i/6]);
            
	    gl.drawArrays(gl.TRIANGLES, i, 6);
    }
	glu.disableVertexAttribArrays(Shaders.shadow);

    
    //step 2: render box (outside) geometry
	gl.useProgram( Shaders.flat );   //    Install the program as part of the current rendering state
	glu.enableVertexAttribArrays(Shaders.flat);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.boxVertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(Shaders.flat.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    
	gl.uniformMatrix4fv(Shaders.flat.locations.modelViewProjectionMatrix, false, mvpMatrix);
	gl.uniform4fv( Shaders.flat.locations.color, [0.5, 0.5, 0.55, 1.0]);
    
	gl.drawArrays(gl.TRIANGLES, 0, this.numBoxVertices);

	glu.disableVertexAttribArrays(Shaders.shadow);

    
    
}
	
Apartment.prototype.renderDepth = function(modelViewMatrix, projectionMatrix)
{
    if (!this.vertices || !Shaders.ready)
        return;

    //all apartment walls are only one-sided. This is fine for rendering, but for computing the shadow depths,
    //the away-facing wall segments also have to be considered
    gl.disable(gl.CULL_FACE);
        
    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);

	gl.useProgram(Shaders.depth);   //    Install the program as part of the current rendering state
	glu.enableVertexAttribArrays(Shaders.depth);

	gl.uniformMatrix4fv(Shaders.depth.locations.modelViewProjectionMatrix, false, mvpMatrix);
    gl.uniform3fv(Shaders.depth.locations.lightPos, mapSun.getPosition());


    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(Shaders.depth.locations.vertexPos, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.boxVertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(Shaders.depth.locations.vertexPos, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    gl.drawArrays(gl.TRIANGLES, 0, this.numBoxVertices);


	glu.disableVertexAttribArrays(Shaders.depth);
    gl.enable(gl.CULL_FACE);
}


Apartment.getTrianglesVertices = function(seg)
{
    /* D-C   
     * |/|
     * A-B  */
    var A = seg.pos;
    
    var w = [seg.width[0], seg.width[1], seg.width[2]];
    var B = [A[0]+w[0], A[1]+w[1], A[2]+w[2]];
    var h = [seg.height[0], seg.height[1], seg.height[2]];
    var C = [B[0]+h[0], B[1]+h[1], B[2]+h[2]];
    var D = [A[0]+h[0], A[1]+h[1], A[2]+h[2]];

    /* extend rectangle by a small amount to make geometry overlap slightly, in order to get rid 
     * of pixel-sized holes between individual triangles caused by numerical inaccuracy.
     * Note that while these computations are done in JavaScript's 'Number' type (i.e. IEEE-754 double),
     * the geometry is uploaded to OpenGl as IEEE-754 float and processed as half-floats at least on mobile devices.
     * So the magnitude of the extension has to be based 'float' accuracy.
     */
    var widthDir = norm3(seg.width);
    var heightDir= norm3(seg.height);
 
    /* numDigitsBias should be the smallest value that still closes all micro holes. 
     * The value "9" has been determined experimentally. */
    var numDigitBias = glu.vertexShaderMediumFloatPrecision - 9;
    var bias = 1/(1 << numDigitBias);

    var ws = mul3scalar(widthDir,  bias); //width shift by 1mm
    var hs = mul3scalar(heightDir, bias); //height shift by 1mm
    

    A = [ A[0] - ws[0] - hs[0], A[1] - ws[1] - hs[1], A[2] - ws[2] - hs[2]];
    B = [ B[0] + ws[0] - hs[0], B[1] + ws[1] - hs[1], B[2] + ws[2] - hs[2]];
    C = [ C[0] + ws[0] + hs[0], C[1] + ws[1] + hs[1], C[2] + ws[2] + hs[2]];
    D = [ D[0] - ws[0] + hs[0], D[1] - ws[1] + hs[1], D[2] - ws[2] + hs[2]];
    

    return [A, B, C, A, C, D];
}

// need not be static, but we need to bind the apartment to a variable different from "this" anyway,
// in order to use it in the anonymous "onload" function.
Apartment.loadImage = function(apartment, id, data)
{
    var image = new Image();
    image.id = id;
    image.onload = function() 
    { 
        glu.updateTexture( apartment.textures[image.id], image);
        
        if (Controller.onRequestFrameRender)
            Controller.onRequestFrameRender();
    };
    
    image.src = "data:image/png;base64," + data;
}

Apartment.prototype.updateTextures = function(textures)
{
    //console.log("New texture set arrived");
    var apartment = this;
    for (var i = 0; i < this.numVertices/6; i++)
    
    {
        if (textures[i])
            Apartment.loadImage(this, i, textures[i]);
            
        //return;        
    }
    
}


/**
 *  creates the 3D GL geometry scene.
 */
Apartment.prototype.buildGlGeometry = function(walls, box)
{
    var vertices = [];
    var texCoords= [];
    var normals  = [];
    for (var i in walls)
    {
        var verts = Apartment.getTrianglesVertices(walls[i]);
        [].push.apply(vertices, [].concat.apply([],verts));
        
        var coords = [].concat([0,0], [1,0], [1,1], /**/ [0,0], [1,1], [0,1]);
        [].push.apply(texCoords, coords);
        
        var N = getNormal( verts[0], verts[1], verts[2]);
        [].push.apply(normals, [].concat(N, N, N, N, N, N) );
    }

    this.numVertices = (vertices.length / 3) | 0;
    
    this.vertices = glu.createArrayBuffer(vertices); //convert to webgl array buffer
    this.texCoords= glu.createArrayBuffer(texCoords);
    this.normals  = glu.createArrayBuffer(normals);
    
    for (var i = 0; i < this.numVertices/6; i++) {
    
        var l = Math.floor((Math.random() * 256));
        var initialColor = new Uint8Array([l, l, l]);
        this.textures[i] = glu.createTextureFromBytes( initialColor );
    
        //this.requestTexture(this.layoutId, i, walls[i]);
    }

    var boxVertices = [];
    for (var i in box)
    {
        var verts = Apartment.getTrianglesVertices(box[i]);
        [].push.apply(boxVertices, [].concat.apply([], verts));
    }    
	this.numBoxVertices = (boxVertices.length / 3) | 0;
	this.boxVertices = glu.createArrayBuffer(boxVertices);
	//console.log(this.numBoxVertices, boxVertices);
}
			
function getAABB( segments, aabbIn)
{
    if (segments.length < 1) 
        return aabbIn;
        
    if (aabbIn)
    {
        var min_x = aabbIn.min_x;
        var max_x = aabbIn.max_x;
        var min_y = aabbIn.min_y;
        var max_y = aabbIn.max_y;
    }
    else
    {
        var min_x = segments[0].pos[0];
        var max_x = segments[0].pos[0];
        var min_y = segments[0].pos[1];
        var max_y = segments[0].pos[1];
    }
    
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


Apartment.prototype.repositionGeometry = function(walls, box)
{
    //step 1: move geometry to correct this.heightOffset;
    //step 2: shift geometry apartment to relocate its center to (0,0) to give its 'position' a canonical meaning
    var aabb = getAABB( walls);
    var aabb = getAABB( box, aabb);
    //var dx = aabb.max_x - aabb.min_x;
    //var dy = aabb.max_y - aabb.min_y;
    var mid_x = (aabb.max_x + aabb.min_x) / 2.0;
    var mid_y = (aabb.max_y + aabb.min_y) / 2.0;
    this.pixelShift = [mid_x, mid_y];

    Apartment.moveBy(walls, -mid_x, -mid_y, this.heightOffset);
    Apartment.moveBy(box,   -mid_x, -mid_y, this.heightOffset);

    this.startingPos[0] -= mid_x;
    this.startingPos[1] -= mid_y;
   
    //step 3: rotate apartment;
    //console.log("apartment yaw is %s", yaw);
    Apartment.rotateBy(walls, this.yawShift);
    Apartment.rotateBy(box,   this.yawShift);
    
    rotate( this.startingPos, this.yawShift);
    this.startingPos[1] = - this.startingPos[1];
}

Apartment.rotateBy = function(segments, yaw)
{
    for (var i in segments)
    {
        rotate( segments[i].pos, yaw);
        rotate( segments[i].width, yaw);
        rotate( segments[i].height, yaw);
    }

}

Apartment.moveBy = function(segments, dx, dy, dz)
{
    for (var i in segments)
    {
        segments[i].pos[0] += dx;
        segments[i].pos[1] += dy;
        segments[i].pos[2] += dz;
    }
}


Apartment.prototype.localToPixelCoordinates = function(localPosition)
{
    if (!mapApartment.pixelShift || mapApartment.yawShift === undefined)
        return [0,0];

    var pos = [];
    pos[0] =   localPosition.x;
    pos[1] = - localPosition.y;

    rotate(pos, - mapApartment.yawShift);
    pos = add2(pos, mapApartment.pixelShift);
    pos[0] *= mapApartment.scale;
    pos[1] *= mapApartment.scale;

    return pos;
}

Apartment.prototype.pixelToLocalCoordinates = function(pixelPosition)
{
    if (!mapApartment.pixelShift || mapApartment.yawShift === undefined)
        return [0,0];

    pixelPosition[0] /= mapApartment.scale;
    pixelPosition[1] /= mapApartment.scale;
    pixelPosition = sub2(pixelPosition, mapApartment.pixelShift);
    rotate(pixelPosition, mapApartment.yawShift);

    return {
        "x":   pixelPosition[0],
        "y": - pixelPosition[1]
    }
}

