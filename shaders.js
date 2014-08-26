"use strict"

var Shaders = {

    init: function(errorOutput) 
    {
    
        var req = new XMLHttpRequest();
        this.errorOutput = errorOutput;
        req.open("GET", "shaders.xml" );
        req.onreadystatechange = function() 
        { 
            if (this.readyState != 4 || this.response == null)
                return;

            //manual parsing is not the most direct approach, but more cross-browser compatible
            var parser = new DOMParser();
            Shaders.onShadersRetrieved(parser.parseFromString(this.responseText, "application/xml"));
        }
        req.send();

    },
    
    onShadersRetrieved: function(dom) 
    {
        var scripts = dom.getElementsByTagName("script");
        //console.log("%o", scripts);
        this.shaderSource = {};
        for (var i = 0; i < scripts.length; i++)
        {
            var type = scripts[i].attributes["type"].value;
            //console.log(type);
            var id   = scripts[i].attributes["id"  ].value;
            var shaderSrc = scripts[i].textContent;
            if (type != "x-shader/x-vertex" && type != "x-shader/x-fragment")
            {
                console.log("[WARN] unknown script type: %s for script %o", type, scripts[i]);
                continue;
            }
            
            if (id === undefined || id === null)
            {
                console.log("[WARN] shader %o has no id, skipping", scripts[i]);
                continue;
            }
            
            this.shaderSource[id] = shaderSrc;
        }
        
        
        this.shadow = glu.createShader(  this.shaderSource["shadowed-shader-vs"], 
                                         this.shaderSource["shadowed-texture-shader-fs"],
                                         ["vertexPosition", "normalIn", "vertexTexCoords"],
                                         ["modelViewProjectionMatrix", "sunDir", "shadowMatrix", "tex", "shadowTex"],
                                         this.errorOutput);

        this.depth = glu.createShader(  this.shaderSource["depth-shader-vs"],
                                        this.shaderSource["depth-shader-fs"],
                                        ["vertexPosition"],
                                        ["modelViewProjectionMatrix", "lightPos"],
                                        this.errorOutput);

        this.building = glu.createShader(this.shaderSource["building-shader-vs"],
                                         this.shaderSource["building-shader-fs"],
                                         ["vertexPosition","vertexTexCoords", "vertexNormal"],
                                         ["modelViewProjectionMatrix", "tex", "cameraPos"],
                                         this.errorOutput);
        
        this.flat = glu.createShader( this.shaderSource["flat-shader-vs"],
                                      this.shaderSource["flat-shader-fs"],
                                      ["vertexPosition"], ["modelViewProjectionMatrix", "color"],
                                      this.errorOutput);

        this.textured = glu.createShader( this.shaderSource["texture-shader-vs"], 
                                          this.shaderSource["texture-shader-fs"],
                                          ["vertexPosition","vertexTexCoords"], 
                                          ["modelViewProjectionMatrix", "tex"],
                                          this.errorOutput);

        Shaders.ready = true;
        scheduleFrameRendering();
        //console.log(shaders);
    
    }

}

