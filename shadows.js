"use strict"

var Shadows = {
    
    dirty: true,
    depthTextureSize : 2048, //according to webglstats.com, a texture size of 2048² is supported virtually everywhere
    
    init: function()
    {
        this.shadowMvpMatrix = mat4.create();

        // Create a color texture for use with the depth shader
        this.colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.depthTextureSize, this.depthTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        // Create the depth texture
        this.depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.depthTextureSize, this.depthTextureSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    },

    renderDepthTexture: function( sunPosition, lookAtPosition, sceneObjects)
    {
        if (! this.dirty)
            return;
        
        this.dirty = false;
        //the sun is the camera for this render pass, so we cannot render without knowing its position
        if (!sunPosition)
            return;

        //use created texture-backed framebuffer as render target (and not the default buffer that is output to screen)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		
		//if the sun is under the horizon, everything is in the shadow. The cleared depth buffer above causes exactly that
		if (sunPosition[2] < 0)
		    return;
		    
		gl.viewport(0, 0, this.depthTextureSize, this.depthTextureSize);

        var modelViewMatrix = mat4.create();
        var pos = [sunPosition[0], -sunPosition[1], sunPosition[2]];
        mat4.lookAt(modelViewMatrix, pos, lookAtPosition, [0,0,1]);
    	mat4.scale(modelViewMatrix, modelViewMatrix, [1,-1,1]);//negate y coordinate to make positive y go downward
	    var projectionMatrix = mat4.create();
	    mat4.perspective(projectionMatrix, fieldOfView/180*Math.PI/300, webGlCanvas.width / webGlCanvas.height, 3000, 5100.0);

        // the apartment shader needs this later to access the shadow buffer
        this.shadowMvpMatrix = mat4.create();
        mat4.mul(this.shadowMvpMatrix, projectionMatrix, modelViewMatrix);


        for (var i in sceneObjects)
            if (sceneObjects[i])
                sceneObjects[i].renderDepth(modelViewMatrix, projectionMatrix);
       
    },


};
