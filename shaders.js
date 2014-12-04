"use strict"

var Shaders = {

    shaderSrc: null,
    
    init: function(errorOutput) 
    {
        if (Shaders.shaderSrc)
            Shaders.onShadersRetrieved(Shaders.shaderSrc);
        else
            Helpers.ajaxGet("shaders.xml", Shaders.onShadersRetrieved.bind(Shaders));
            
        Shaders.errorOutput = errorOutput;
    },
    
    onShadersRetrieved: function(xmlRaw) 
    {
        Shaders.shaderSrc = xmlRaw;
        var parser = new DOMParser();
        var dom = parser.parseFromString(xmlRaw, "application/xml");
    
    
        var scripts = dom.getElementsByTagName("script");
        //console.log("%o", scripts);
        Shaders.shaderSource = {};
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
            
            Shaders.shaderSource[id] = shaderSrc;
        }
    
        //don't need the depth shader otherwise
        if (glu.performShadowMapping)
            Shaders.depth = glu.createShader(Shaders.shaderSource["depth-shader-vs"],
                                         Shaders.shaderSource["depth-shader-fs"],
                                         ["vertexPosition"],
                                         ["modelViewProjectionMatrix", "lightPos"],
                                         Shaders.errorOutput);

        Shaders.building = glu.createShader( Shaders.shaderSource["building-shader-vs"],
                                             Shaders.shaderSource["building-shader-fs"],
                                             ["vertexPosition","vertexTexCoords", "vertexNormal", "vertexColorIn"],
                                             ["modelViewProjectionMatrix", "tex", "cameraPos"],
                                             Shaders.errorOutput);
        
        Shaders.flat = glu.createShader( Shaders.shaderSource["flat-shader-vs"],
                                         Shaders.shaderSource["flat-shader-fs"],
                                         ["vertexPosition"], ["modelViewProjectionMatrix", "color"],
                                         Shaders.errorOutput);

        Shaders.textured = glu.createShader( Shaders.shaderSource["texture-shader-vs"], 
                                          Shaders.shaderSource["texture-shader-fs"],
                                          ["vertexPosition","vertexTexCoords"], 
                                          ["modelViewProjectionMatrix", "tex"],
                                          Shaders.errorOutput);

        Shaders.shadow = glu.performShadowMapping ? 
                        glu.createShader(  Shaders.shaderSource["shadowed-shader-vs"], 
                                         Shaders.shaderSource["shadowed-texture-shader-fs"],
                                         ["vertexPosition", "normalIn", "vertexTexCoords"],
                                         ["modelViewProjectionMatrix", "sunDir", "shadowMatrix", "tex", "shadowTex"],
                                         Shaders.errorOutput) : Shaders.textured;


        Shaders.ready = true;
        scheduleFrameRendering();
        //console.log(shaders);
    
    }

}

