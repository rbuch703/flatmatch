"use strict"

function getDayOfYear( date ) {
    var year = new Date(date.getFullYear(), 0, 0);
    var dt = date.valueOf() - year.valueOf();  //milliseconds since beginning of year
    return dt/ (1000 * 24 * 60 * 60);
}



function Sun(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    this.dayOfYear = 229;
    this.time = 12; //noon;

    this.shaderProgram = glu.createShader(  document.getElementById("shader-vs").text,
                                            document.getElementById("sun-shader-fs").text,
                                            ["vertexPosition", "vertexTexCoords"],
                                            ["modelViewProjectionMatrix", "tex"] );
    this.buildGlGeometry();

}

// source of computation: http://www.pveducation.org/pvcdrom/properties-of-sunlight/suns-position
Sun.prototype.getAngles = function() {
    var dtGmt = 1; //usually one hour time difference to GMT

    // day-of-the-year at which summer time begins. Technically, European summer time starts on the last Sunday in March. But since we do not want the user to have to enter a year, we'll just use the end of March as an approximation
    var summerTimeBegins = 31+28+31;
    // day-of-the-yeat at which summer time ends. We use the last of October as an approximation
    var summerTimeEnds = 365 - 31 - 30 - 31;
    
    if (this.dayOfYear > summerTimeBegins && this.dayOfYear < summerTimeEnds)
        dtGmt = 2;

    var LSTM = 15 * dtGmt; //Local Standard Time Meridian
    var B = (this.dayOfYear - 81) / 365 * 2 * Math.PI;
    
    var EoT = 9.87 * Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B); //Equation of Time;
    //console.log("EoT: %s", EoT);    
    var TC = 4 * (this.lng - LSTM) + EoT; // Time Correction Factor
    
    var LST = this.time + TC/60; //Local Solar Time
    
    var HRA = (15 * (LST - 12)) / 180 * Math.PI;  // Hour Angle in radiants
    var delta = (23.45 * Math.sin(B)) / 180 * Math.PI; // declination in radiants
    //console.log("Declination: %s", delta/Math.PI*180);
    
    var phi = this.lat / 180 * Math.PI;           // latitude in radiants
    
    var elevation = Math.asin( Math.sin(delta) * Math.sin(phi) + 
                               Math.cos(delta) * Math.cos(phi) * Math.cos(HRA));
                              
    var azimuth = Math.acos( (Math.sin(delta) * Math.cos(phi) - 
                              Math.cos(delta) * Math.sin(phi) * Math.cos(HRA)) /
                              Math.cos(elevation));
    
    if (HRA > 0) azimuth = 2 * Math.PI - azimuth;
    return {"elevation": elevation, "azimuth": azimuth};
}

Sun.prototype.getPosition = function() {

    var angles = this.getAngles();

    //var RADIUS = 00;  //Skybox radius (on which the sun is pinned)
    return [ SkyDome.RADIUS * Math.sin(angles.azimuth) * Math.cos(angles.elevation), 
            -SkyDome.RADIUS * Math.cos(angles.azimuth) * Math.cos(angles.elevation), 
             SkyDome.RADIUS * Math.sin(angles.elevation)];

}

Sun.prototype.buildGlGeometry = function() {
    if (this.vertices)
        gl.deleteBuffer(this.vertices);

    var shift = this.getPosition();
    //console.log(shift);
    var vertices= [];
 	
	var base = [];
	var top = [];
		
	var NUM_H_SLICES = 10;
	var NUM_V_SLICES = 10;
	for (var i = 0; i < NUM_H_SLICES; i++)
	{
		var azimuth1 = i / NUM_H_SLICES * 2 * Math.PI;    //convert to radiants in  [0...2*PI]
		var x1 = Math.cos(azimuth1) * Sun.RADIUS;
		var y1 = Math.sin(azimuth1) * Sun.RADIUS;

		var azimuth2 = (i+1) / NUM_H_SLICES * 2 * Math.PI;
		var x2 = Math.cos(azimuth2) * Sun.RADIUS;
		var y2 = Math.sin(azimuth2) * Sun.RADIUS;


	    for (var j = 0; j+1 <= NUM_V_SLICES; j++)
    	{
    	    var polar1 =  j    * Math.PI / (2.0 * NUM_V_SLICES); //convert to radiants in [0..1/2*PI]
    	    var polar2 = (j+1) * Math.PI / (2.0 * NUM_V_SLICES);

            
		    var A = [x1 * Math.cos(polar1), y1 * Math.cos(polar1), Sun.RADIUS * Math.sin(polar1)];
		    var B = [x2 * Math.cos(polar1), y2 * Math.cos(polar1), Sun.RADIUS * Math.sin(polar1)];
		    var C = [x2 * Math.cos(polar2), y2 * Math.cos(polar2), Sun.RADIUS * Math.sin(polar2)];
		    var D = [x1 * Math.cos(polar2), y1 * Math.cos(polar2), Sun.RADIUS * Math.sin(polar2)];

		
		    var verts = [].concat(A, C, B, A, D, C);
		    vertices.push.apply( vertices, verts);
		    
		    A[2] = -A[2];
		    B[2] = -B[2];
		    C[2] = -C[2];
		    D[2] = -D[2];
		    verts = [].concat(A, B, C, A, C, D);
		    //var verts = [].concat(A, C, B, A, D, C);
		    vertices.push.apply( vertices, verts);
		    
		}
	}

	for (var i = 0; i < vertices.length; i+=3)
	{
	    vertices[i  ] += shift[0];
	    vertices[i+1] += shift[1];
	    vertices[i+2] += shift[2];
	}
	
	this.numVertices = vertices.length / 3;
    this.vertices = glu.createArrayBuffer(vertices);
    //this.texCoords= glu.createArrayBuffer(this.texCoords);
}

Sun.prototype.render = function(modelViewMatrix, projectionMatrix) {
        
	gl.useProgram(this.shaderProgram);   //    Install the program as part of the current rendering state
	gl.enableVertexAttribArray(this.shaderProgram.locations.vertexPosition); // setup vertex coordinate buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);   //select the vertex buffer as the currrently active ARRAY_BUFFER (for subsequent calls)
	gl.vertexAttribPointer(this.shaderProgram.locations.vertexPosition, 3, gl.FLOAT, false, 0, 0);  //assigns array "vertices" bound above as the vertex attribute "vertexPosition"
    
    /*if (this.shaderProgram.locations.vertexTexCoords != -1)
    {
	    gl.enableVertexAttribArray(this.shaderProgram.locations.vertexTexCoords); //setup texcoord buffer
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords);
	    gl.vertexAttribPointer(this.shaderProgram.locations.vertexTexCoords, 2, gl.FLOAT, false, 0, 0);  //assigns array "texCoords" bound above as the vertex attribute "vertexTexCoords"
	}*/

    var mvpMatrix = mat4.create();
    mat4.mul(mvpMatrix, projectionMatrix, modelViewMatrix);
	gl.uniformMatrix4fv(this.shaderProgram.locations.modelViewProjectionMatrix, false, mvpMatrix);
    
	gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
}

Sun.RADIUS = 100;
