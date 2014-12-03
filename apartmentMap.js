"use strict"

var ApartmentMap = (function(){

    var scaledLayout;
    var canvas;
    var layoutImage;
    var onClick;
	//layoutImage

    function init(_canvas, layoutSrc) 
    {
        canvas = _canvas;
        
        layoutImage = new Image();
        layoutImage.onload = function() {
            scaledLayout = null;   //to trigger a re-render on next draw;
            resize(); 
            scheduleFrameRendering();
        };

        layoutImage.src = layoutSrc;
        
        canvas.removeEventListener("click", onMapClick);
        canvas.addEventListener("click", onMapClick);

        resize();
        
    }
    
    function onMapClick(ev) {
        var canvasScale = Math.min( canvas.width  / layoutImage.width, 
                                    canvas.height / layoutImage.height);

        var pos = canvas.getBoundingClientRect();

        var x = (ev.clientX - pos.x)  / canvasScale;
        var y = (ev.clientY - pos.y)  / canvasScale;
    
        if (onClick)
            onClick(x, y);
    }
    
    function addEventListener(evt, handler)
    {
        if (evt == "click")
            onClick = handler;
    }
    
    
    function createScaledLayout(width, height)
    {
        if (scaledLayout && 
            scaledLayout.width == width && 
            scaledLayout.height == height)
        { 
            return;
        }
        
        if (width*height == 0)
        {
            scaledLayout = null;
            return;
        }
            
        // Create a canvas element
        scaledLayout = document.createElement('canvas');
        scaledLayout.width = width;
        scaledLayout.height = height;

        // Get the drawing context
        var ctx = scaledLayout.getContext('2d');

        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,width,height);    

	    var canvasScale = Math.min( canvas.width  / layoutImage.width, 
	                                canvas.height / layoutImage.height);

	    ctx.globalAlpha = 0.5;
	    ctx.drawImage(layoutImage, 0, 0, layoutImage.width * canvasScale, layoutImage.height * canvasScale);
	    ctx.globalAlpha = 1.0;

    }
    
	function render( layoutPixelPosition)
	{
	    if (!layoutImage)
	        return;

	    if (!canvas.context2d)
	        canvas.context2d = canvas.getContext("2d");

        var ctx = canvas.context2d;
        //ctx.clearRect ( 0 , 0 , canvas.width , canvas.height );
	    var canvasScale = Math.min( canvas.width  / layoutImage.width, 
	                                canvas.height / layoutImage.height);

        createScaledLayout(canvas.width, canvas.height);
        if (scaledLayout)
            ctx.drawImage(scaledLayout, 0, 0);

	    var pos = layoutPixelPosition;

	    pos[0] *= canvasScale;
	    pos[1] *= canvasScale;
        var RADIUS = canvas.width / 60;

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#44D";
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], RADIUS, 0, 2 * Math.PI);
        ctx.stroke();

        var effYaw = Controller.viewAngleYaw - mapApartment.yawShift;
        effYaw = effYaw / 180 * Math.PI;
        var lookDir = [Math.sin(effYaw), Math.cos(effYaw) ];
        ctx.strokeStyle = "#D44";
        ctx.beginPath();
        ctx.moveTo( pos[0], pos[1]);
        ctx.lineTo( pos[0] + 2*RADIUS * lookDir[0], pos[1] - 2*RADIUS * lookDir[1]);
        ctx.stroke();

	}

    function resize()
    {
        //if (!layoutImage)
        //    return;

        //var aspect = layoutImage.width / layoutImage.height;
        //canvas.style.height = canvas.clientWidth / aspect + "px";
        canvas.height = canvas.clientHeight;
        canvas.width  = canvas.clientWidth;
        scheduleFrameRendering();
    }

    return { init: init, 
             render:render, 
             resize:resize,
             addEventListener: addEventListener};
})();

