"use strict"

//var map;
var mapPlane;
var mapBuildings;
var mapSkyDome;
var mapApartment;
var mapSun;

var gl;


var fieldOfView = 90/16*9;
var layoutId;// = 158;
var rowId;
//var OFFER_REST_BASE_URL = "http://rbuch703.de/rest";
//var OFFER_REST_BASE_URL = "http://localhost:1080/rest_v2"
var OFFER_REST_BASE_URL = "rest"

var mqSaveSpace = window.matchMedia( "(max-width: 799px), (max-height: 799px)" );
var mqLandscape = window.matchMedia( "(orientation: landscape)" );
var myToolbar;


//pasted from controller.js; FIXME: find better common place
function toDictionary (queryString)
{
    var parts = queryString.split("&");
    var res = {};
    for (var i in parts)
    {
        var kv = parts[i].split("=");
        if (kv.length == 2)
        {
            res[kv[0]] = parseFloat(kv[1]);
        }
    }
    return res;
}


//copied from helper.js; TODO. find better shared location
function getFloorName( level)
{
    if (level == 0) return "Erdgeschoss";
    if (level > 0) return level + ". Etage";
    if (level < 0) return level + ". Untergeschoss";
}

//copied from helper.js; TODO. find better shared location
function asPriceString( val)
{
    var tmp = Math.floor(val * 100);
    var res = Math.floor(tmp / 100);
    tmp = tmp % 100;
    if (tmp < 10) tmp = "0" + tmp;
    return res + "," + tmp + " €";
}

function initEventHandlers()
{
   /* prevention of default event handling is required for:
     * - 'mousedown': otherwise dragging the mouse cursor beyond the canvas would select the page text in chrome
     * - 'keydown': otherwise using the cursor keys for navigation would also scroll the page
     */

    webGlCanvas.addEventListener("mousedown",   function(ev) {ev.preventDefault(); Controller.onMouseDown(ev);}, false);
    webGlCanvas.addEventListener("mouseup",     function(ev) {Controller.onMouseUp(ev);},   false);
    webGlCanvas.addEventListener("mouseout",    function(ev) {Controller.onMouseUp(ev);},   false);
    webGlCanvas.addEventListener("mousemove",   function(ev) {Controller.onMouseMove(ev);}, false);
    webGlCanvas.addEventListener("touchstart",  function(ev) {Controller.onTouchDown(ev);}, false);
    webGlCanvas.addEventListener("touchcancel", function(ev) {Controller.onTouchEnd(ev);},  false);
    webGlCanvas.addEventListener("touchend",    function(ev) {Controller.onTouchEnd(ev);},  false);
    webGlCanvas.addEventListener("touchleave",  function(ev) {Controller.onTouchEnd(ev);},  false);
    webGlCanvas.addEventListener("touchmove",   function(ev) {Controller.onTouchMove(ev);}, false);

    document.addEventListener("keydown", function(ev) { if (ev.keyCode == 38 || ev.keyCode == 40) ev.preventDefault(); Controller.onKeyDown(ev);},  false);
    document.addEventListener("keyup",   function(ev) {Controller.onKeyUp(ev);},  false);
	document.body.onresize = onResize;

    
	ApartmentMap.addEventListener("click", function(x,y) { 
        var newPos = mapApartment.pixelToLocalCoordinates([x,y]);
        Controller.moveTo( newPos.x, newPos.y);
        scheduleFrameRendering();
    }, false );
    
    Controller.onRequestFrameRender = scheduleFrameRendering;
}

function offerMetadataLoaded(offerRaw)
{
    var offer = JSON.parse(offerRaw);
    if (!gl)
        return;

    //educated guess (3m per level, plus 1m for basement part that is above ground
    var apartmentFloorHeight = offer.level * 3.0 + 1.0;
    Controller.position = {"lat": offer.lat, "lng": offer.lon};

    if (offer.yaw != null)
        Controller.viewAngleYaw = parseFloat(offer.yaw);
    
    if (glu.performShadowMapping)
        mapSun = new Sun( Controller.position );
        
    //initialize mapSun date/time
    onSunPositionChanged( $( "#slider-day" ).slider( "value"), $( "#slider-time" ).slider( "value"));

    mapBuildings = new Buildings(gl, Controller.position);
    mapBuildings.onLoaded = function()
    {
        //buildings are occluders in the shadow computation, their presence may thus shift shadows
        Shadows.dirty = true;
        scheduleFrameRendering();
    }

    mapApartment = new Apartment(offer.layoutId, offer.scale, offer.layout, offer.yaw != null ? offer.yaw : 0.0, apartmentFloorHeight);
    Helpers.ajaxGet(OFFER_REST_BASE_URL + "/get/textures/" + offer.layoutId, mapApartment.updateTextures.bind(mapApartment));

    Controller.localPosition.x = mapApartment.startingPos[0];
    Controller.localPosition.y = mapApartment.startingPos[1];
    Controller.localPosition.z =  apartmentFloorHeight + 1.6; 

    //needs to be created after Controller.localPosition.z is set, as this height is relevant to determine the necessary map detail
    mapPlane = new MapLayer();
    mapPlane.onProgress= scheduleFrameRendering;

    
    lblAddress.textContent = offer.address;
    lblLevel.textContent = getFloorName(offer.level);
    lblSize.textContent = offer.area + "m²";
    lblRooms.textContent = offer.numRooms;
    lblRent.textContent = asPriceString(offer.rent);

    lblDetails.innerHTML = "";  //dirty hack to remove all children
    var a = document.createElement("A");
    a.target = "_blank";
    a.href = offer.contactWebsite;
    a.textContent = "[in neuem Tab]";
    lblDetails.appendChild(a);
    //"<a target='_blank' href='"+  + "'></a>"
    //addressLog.innerHTML = offer.address;


    CollisionHandling.init(offer.layout.layoutImageSize[0], offer.layout.layoutImageSize[1], offer.collisionMap);

    VicinityMap.init("mapDiv", offer.lat, offer.lon);

    var layoutImageSrc = offer.layoutImageUrl ? 
                         offer.layoutImageUrl :
                         OFFER_REST_BASE_URL + "/get/layout/"+ offer.layoutId;
    ApartmentMap.init(layoutDiv, layoutCanvas, layoutImageSrc);

    initEventHandlers();
    
    scheduleFrameRendering();

}    

/*
function onApartmentMapShow()
{
    ApartmentMap.resize();
    ApartmentMap.render(mapApartment.localToPixelCoordinates( Controller.localPosition ));
}*/


function onSunPositionChanged(day, time)
{
    if (!mapSun)
        return;
        
    mapSun.setMomentInTime(day, time);
    
    var riseTime = mapSun.getSunriseTime();
    if (riseTime == null) riseTime = 0.0;
    
    var setTime = mapSun.getSunsetTime();
    if (setTime == null) setTime = 24.0;
    
    $( "#slider-time" ).slider("option", "min", riseTime);
    $( "#slider-time" ).slider("option", "max", setTime);
    
    lblDay.textContent = Helpers.getDayString(day);
    var hour = time | 0;
    var minute = ""+ ((time - hour)*60).toFixed(0);
    while (minute.length < 2) 
        minute = "0" + minute;

   lblTime.textContent =  "" + hour + ":" + minute;
   
   if (time == riseTime)
    lblTime.textContent += " (Sonnenaufgang)";
    
   if (time == setTime)
    lblTime.textContent += " (Sonnenuntergang)";

    
    Shadows.dirty = true;
    scheduleFrameRendering();
}
    
function init()
{
    var idx = document.URL.indexOf("?");
    if (idx)
    {
        var params = toDictionary (document.URL.substring(idx + 1));
        rowId = params.rowid ? parseInt(params.rowid) : 13;
    }
    
    initGl();  //initialize webGL canvas
    if (!gl)
        return;
   
    Shaders.init(errorLog);

    var date = new Date(Date.now());
    
    jQuery( "#slider-day" ).slider({
        min: 0,
        max: 364,
        value: getDayOfYear(date),
        step:1,
        stop:  function( event, ui ) { onSunPositionChanged( ui.value, mapSun.time); },
        slide: function( event, ui ) { onSunPositionChanged( ui.value, mapSun.time); }
        });

    jQuery( "#slider-time" ).slider({
        min: 0,
        max: 24,
        value: date.getHours() + 1/60* date.getMinutes(),
        step:0.01,
        stop:  function( event, ui ) { onSunPositionChanged(mapSun.dayOfYear, ui.value); },
        slide: function( event, ui ) { onSunPositionChanged(mapSun.dayOfYear, ui.value); }
        });

    //disallow slider manipulation via keyboard, as keyboard input is alredy used for movement inside the scene
    jQuery("#slider-day .ui-slider-handle").unbind('keydown');    
    jQuery("#slider-time .ui-slider-handle").unbind('keydown');    
    
    Helpers.ajaxGet(OFFER_REST_BASE_URL + "/get/offer/" + rowId, offerMetadataLoaded);


    var ua = navigator.userAgent.toLowerCase();
    var isAndroid = ua.indexOf("android") > -1;
    var isWebkit  = ua.indexOf("webkit")  > -1;
    var isIphone  = ua.indexOf("iphone")  > -1;
    var isIpad    = ua.indexOf("ipad")  > -1;
    var isIos     = isIphone || isIpad;
        
    /* theres a bug in Webkit mobile where the browser nav bar is (correctly) hidden on fullscreen,
       but is not shown again when fullscreen mode is left. Normally, the nav bar would then be
       shown again when the user scrolls up, but in our case there is no scrolling (as touch dragging
       is used for movement). So the nav bar would never be shown, rendering the browser useless.
       At this time, the only workaround to disable fullscreen mode on those devices.
       */
    var isBuggy = ( (isAndroid || isIos) && isWebkit);

    if (!isBuggy)
    	var tmp = new FullScreenButton( btnFullScreen, 
	        {target:dummy, 
	        icon:       "images/ic_action_full_screen.png",
	        returnIcon: "images/ic_action_return_from_full_screen.png"});

    var toolbarEntries = [
        {icon: "images/ic_action_place.png", target:mapDiv, onShow:function(){VicinityMap.onChangeSize(); }},
        {icon: "images/ic_action_layout.png", target:layoutDiv, onShow:ApartmentMap.resize.bind(ApartmentMap)},
        {icon: "images/ic_action_sun_position.png",target: divSunPos},
        {icon: "images/ic_action_details.png", target:divDetails},
        {icon: "images/ic_action_help.png", target:divUsageNotes}];
              
    if (!glu.performShadowMapping)
        delete toolbarEntries[2];
    
    

    myToolbar = new WindowToolBar( toolbarDiv, { windows: toolbarEntries });
    
    mqSaveSpace.addListener(onResize);
    mqLandscape.addListener(onResize);
    onResize();
}   

var frameRenderingScheduled = false;
function scheduleFrameRendering()
{
    if (frameRenderingScheduled)
        return;

    frameRenderingScheduled = true;
    if (window.requestAnimationFrame)
        window.requestAnimationFrame(executeFrameRendering);
    else
        executeFrameRendering();
}

function executeFrameRendering()
{
    frameRenderingScheduled = false;

    if (Controller.position.lat === undefined || Controller.position.lng === undefined)
        return;

    
    // If at least one key is still pressed, schedule rendering of the next frame right away:
    // A pressed key will potentially change the scene and require a re-rendering
    if (Controller.keysStillPressed())
        scheduleFrameRendering();

    if (Controller.keysStillPressed())
        Controller.updateKeyInteraction();

    VicinityMap.updatePositionMarker( Controller.getEffectivePosition() );
    VicinityMap.renderFrustum();
    renderScene();
    
    if (mapApartment != undefined)
        ApartmentMap.render( mapApartment.localToPixelCoordinates( Controller.localPosition ) );
}

function onGlContextLost(event)
{
    event.preventDefault();
    gl = null; //to prevent all access to the Gl context
    
    //these need to be reset as they contain ressources bound to the lost gl context
    mapBuildings = null;
    mapApartment = null;
    mapPlane = null;
    mapSun = null;
    mapSkyDome = null;

    
}

function onGlContextRestored(event)
{
    initGl();    
    Shaders.init(errorLog);

    mapSkyDome = new SkyDome();
    mapSkyDome.onLoaded = scheduleFrameRendering;

    Helpers.ajaxGet(OFFER_REST_BASE_URL + "/get/offer/" + rowId, offerMetadataLoaded);
}

/**
 * Initialises WebGL and creates the 3D scene.
 */
function initGl()
{
    //create context
	gl = webGlCanvas.getContext("webgl") || webGlCanvas.getContext("experimental-webgl");
	
    webGlCanvas.addEventListener("webglcontextlost", onGlContextLost, false);	
    webGlCanvas.addEventListener("webglcontextrestored", onGlContextRestored, false);	
	
	if(!gl)
	{
	    //remove controls that depend on webGL, and show error messages
        glErrorDiv.style.display = "inherit";
        dummy.style.display = "none";
        divDisclaimer.style.display = "none";
        
        lblGlErrorMessage.textContent = Helpers.getWebGlFailReason();
		return;
	}
	
	glu.init();
	Shadows.init();
	
	//gl = WebGLDebugUtils.makeDebugContext(gl);
	
	gl.clearColor(0.5, 0.5, 0.5, 1.0);

	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    onResize();

    mapSkyDome = new SkyDome();
    mapSkyDome.onLoaded = scheduleFrameRendering;

}

/*Note on canvas size attributes: 
 *   - Canvas.style.height sets the size of the object on screen, but is a CSS property (may also be something like "100%")
 *   - Canvas.height sets the logical size of the drawing buffer is pixels (its content is later scaled to fit the object on screen)
 *   - Canvas.clientHeight is the read-only value of the consequence of Canvas.style.height in pixels (even if style.height is given in percent, etc.)
 */	    


function onResize()
{

    /* Layouting algorithm:
     *   - if there is enough space (> 800x800px) or no tool window is shown -> display the tool window as a 400x400 overlay (smaller if the tool window requires less space), and let the GL canvas cover the whole screen
     *   - if there is not enough space and a tool window is shown:
     *      - if the screen is in landscape mode --> display the tool window as
     *        a side pane covering the left 400px (less if it needs less space) 
     *        of the screen at full height, and the GL canvas to cover the 
     *        remaining space
     *      - if the screen is in portrait mode --> display the tool window as
     *        a top pane covering the top 400px (less if it needs less space)
     *        of the screen at full width, and the GL canvas to cover the
     *        remaining space
     *
     * A tool window needs less than the alotted space, if:
     *  - for a div with html content: if its content fits into less than the
     *    alotted space (as determined by the browser's layout engine)
     *  - for the layout div: it will determine its space needs using its own
     *    algorithm base on the layout image aspect ratio
     *  - for the map div: it will always cover all of the available space
    */

    var wnd = myToolbar ? myToolbar.getActiveWindow() : undefined;
    var anyToolbarVisible = (wnd && wnd.target);
    var activeDiv = anyToolbarVisible;
    //dummy element so that the existence of activeDiv is guaranteed for the following code 
    if (!activeDiv)
        activeDiv = {style:{offsetTop:"72px;", offsetHeight:"0px"}};
        
    var mode = "overlay";

    if (mqSaveSpace.matches && anyToolbarVisible)
        mode = (mqLandscape.matches) ? "side" : "top";
        
    switch ( mode )
    {
        case "overlay":
            canvasContainer.style.left = "0px";
            canvasContainer.style.top = "0px";
            activeDiv.className = "toolWindow toolOverlay";
            activeDiv.style.maxHeight = ""


            if (activeDiv == mapDiv)
            {                
                mapDiv.className = "toolWindow toolOverlay leaflet-container leaflet-fade-anim";
                mapDiv.style.width = "400px";
                mapDiv.style.height = "400px";
            }
            if (activeDiv == layoutDiv)
            {
                ApartmentMap.resize( 400, 400);
            }
                
        break;
        case "side":
            canvasContainer.style.top  = "0px";
            activeDiv.style.maxHeight = ""
            
            activeDiv.className = "toolWindow toolSide";
            if (activeDiv == mapDiv)
            {
                mapDiv.className = "toolWindow toolSide leaflet-container leaflet-fade-anim";
                mapDiv.style.width = "400px";
                mapDiv.style.height = ""; 
            }

            if (activeDiv == layoutDiv)
                ApartmentMap.resize( 400, window.innerHeight - 72);

            canvasContainer.style.left = (activeDiv.offsetLeft + activeDiv.offsetWidth) + "px";
        break;
            
        case "top":
            canvasContainer.style.left = "0px";
            activeDiv.className = "toolWindow toolTop";
            activeDiv.style.height = ""
            activeDiv.style.width = "";
            activeDiv.style.maxHeight = "400px"
            
            if (activeDiv == mapDiv)
            {
                mapDiv.className = "toolWindow toolTop leaflet-container leaflet-fade-anim";
                mapDiv.style.width = "";
                mapDiv.style.height= "400px";
            }

            if (activeDiv == layoutDiv)
                ApartmentMap.resize( window.innerWidth, 400);

            canvasContainer.style.top  = activeDiv.offsetTop + activeDiv.offsetHeight + "px";

        break;
    }
    
    divDisclaimer.style.left = canvasContainer.style.left;

    var aspect = webGlCanvas.clientWidth / webGlCanvas.clientHeight;

    /* Render the 3D view at half the device's native pixel count.
       This is a compromise between having a high resolution 3D view (even for
       devices with a high devicePixelRatio) and still being fast enough for smooth
       interaction. 
     */
    
    webGlCanvas.height = webGlCanvas.clientHeight * window.devicePixelRatio / Math.sqrt(2);
    webGlCanvas.width  = webGlCanvas.clientWidth  * window.devicePixelRatio / Math.sqrt(2);
   
    VicinityMap.onChangeSize();
    ApartmentMap.resize();

    
    scheduleFrameRendering();
}	


function renderScene()
{
    if (!gl || !Controller.localPosition ) //not yet initialized
        return;

    var sunPos = mapSun ? mapSun.getPosition() : (mapSkyDome ? [0,0,mapSkyDome.RADIUS] : [0,0,5000]);
    Shadows.renderDepthTexture(sunPos, [0, 0, Controller.localPosition.z], [mapBuildings, mapApartment]);
    
    //select default frame buffer (do not render to texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	gl.viewport(0, 0, webGlCanvas.width, webGlCanvas.height);

    var modelViewMatrix = glu.lookAt(Controller.viewAngleYaw, Controller.viewAnglePitch, Controller.localPosition);
    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView/180*Math.PI, webGlCanvas.width / webGlCanvas.height, 0.5, 5100.0);

    gl.enable(gl.CULL_FACE);

    var renderItems = [mapPlane, mapBuildings, mapSkyDome, mapSun];
    for (var i in renderItems)
        if (renderItems[i])
            renderItems[i].render(modelViewMatrix, projectionMatrix, Shadows.shadowMvpMatrix);

    /*note: mapApartment has to be rendered last, as it clears the z-buffer to work
     *      around some artifacts caused by building geometry intersecting with apartment geometry.
     *      Rendering anything afterwards will likely overdraw
     *      portions of the image even though they are closer to the camera */
     
    /* note2: We use a different set of near/far planes for the apartment than for the rest of the scene, because we
     *        need a different depth range: The apartment has a diameter of less than 100 meters (= far plane), but the 
     *        user may get as close as a few centimeters to any given wall (= near plane). The user never gets any closer
     *        than about 2m to any other scene object (sun, sky, map plane, other buildings), but these need to be rendered
     *        even if as far as 5km away. Using a shared z-range for all objects would lead to numerical inaccuracies for 
     *        far away objects, appearing as drawn edges not matching the seam between object faces, etc.
     *        Changing near/far planes during rendering corrupts the z-Buffer (as the stored values are relative to the old
     *        near/far planes) and would normally corrupt the final image. But the render code for the apartment clear the 
     *        z-buffer anyway, and so nicely gets around that problem.
    */
    if (mapApartment)
    {
        var projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView/180*Math.PI, webGlCanvas.width / webGlCanvas.height, 0.01, 100.0);
        mapApartment.render(modelViewMatrix, projectionMatrix, Shadows.shadowMvpMatrix);
    }
	//gl.flush();
}

//document.addEventListener("load", init, false);
window.onload = init;

