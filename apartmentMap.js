"use strict"

var ApartmentMap = {

	//layoutImage

    init: function(canvas, layoutId) 
    {
        ApartmentMap.canvas = canvas;
        
        ApartmentMap.layoutImage = new Image();
        ApartmentMap.layoutImage.onload = function() {ApartmentMap.resize(); scheduleFrameRendering();};
        ApartmentMap.layoutImage.src = OFFER_REST_BASE_URL + "/get/layout/"+ layoutId;
        
        
        ApartmentMap.canvas.addEventListener("click", function(ev) {
	        var canvasScale = Math.min( ApartmentMap.canvas.width  / ApartmentMap.layoutImage.width, 
	                                    ApartmentMap.canvas.height / ApartmentMap.layoutImage.height);

            var x = (ev.pageX - ApartmentMap.canvas.offsetLeft) / canvasScale;
            var y = (ev.pageY - ApartmentMap.canvas.offsetTop) / canvasScale;
        
            if (ApartmentMap.onClick)
                ApartmentMap.onClick(x, y);
        });

    },
    
    scaledLayout: null,
    
    createScaledLayout: function(width, height)
    {
        if (ApartmentMap.scaledLayout && 
            ApartmentMap.scaledLayout.width == width && 
            ApartmentMap.scaledLayout.height == height)
        { 
            return;
        }
            
        // Create a canvas element
        ApartmentMap.scaledLayout = document.createElement('canvas');
        ApartmentMap.scaledLayout.width = width;
        ApartmentMap.scaledLayout.height = height;

        // Get the drawing context
        var ctx = ApartmentMap.scaledLayout.getContext('2d');

        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,width,height);    

	    var canvasScale = Math.min( ApartmentMap.canvas.width  / ApartmentMap.layoutImage.width, 
	                                ApartmentMap.canvas.height / ApartmentMap.layoutImage.height);

	    ctx.globalAlpha = 0.5;
	    ctx.drawImage(ApartmentMap.layoutImage, 0, 0, ApartmentMap.layoutImage.width * canvasScale, ApartmentMap.layoutImage.height * canvasScale);
	    ctx.globalAlpha = 1.0;

    },
    
	render: function( layoutPixelPosition)
	{
	    if (!ApartmentMap.layoutImage)
	        return;

	    if (!ApartmentMap.canvas.context2d)
	        ApartmentMap.canvas.context2d = ApartmentMap.canvas.getContext("2d");

        var ctx = ApartmentMap.canvas.context2d;
        //ctx.clearRect ( 0 , 0 , ApartmentMap.canvas.width , ApartmentMap.canvas.height );
	    var canvasScale = Math.min( ApartmentMap.canvas.width  / ApartmentMap.layoutImage.width, 
	                                ApartmentMap.canvas.height / ApartmentMap.layoutImage.height);

        ApartmentMap.createScaledLayout(ApartmentMap.canvas.width, ApartmentMap.canvas.height);
        ctx.drawImage(ApartmentMap.scaledLayout, 0, 0);

	    var pos = layoutPixelPosition;

	    pos[0] *= canvasScale;
	    pos[1] *= canvasScale;
        var RADIUS = ApartmentMap.canvas.width / 60;

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

	},

    resize: function()
    {
        if (!ApartmentMap.layoutImage)
            return;

        var aspect = ApartmentMap.layoutImage.width / ApartmentMap.layoutImage.height;
        ApartmentMap.canvas.style.height = ApartmentMap.canvas.clientWidth / aspect + "px";
        ApartmentMap.canvas.height = ApartmentMap.canvas.clientHeight;
        ApartmentMap.canvas.width  = ApartmentMap.canvas.clientWidth;
    }
    
}

