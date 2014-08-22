"use strict"

var ApartmentMap = {

	//layoutImage

    init: function(canvas, layoutId) 
    {
        this.canvas = canvas;
        
        this.layoutImage = new Image();
        this.layoutImage.onload = function() {ApartmentMap.resize(); scheduleFrameRendering();};
        this.layoutImage.src = OFFER_REST_BASE_URL + "/get/layout/"+ layoutId;
        
        
        this.canvas.addEventListener("click", function(ev) {
	        var canvasScale = Math.min( ApartmentMap.canvas.width  / ApartmentMap.layoutImage.width, 
	                                    ApartmentMap.canvas.height / ApartmentMap.layoutImage.height);

            var x = (ev.pageX - ApartmentMap.canvas.offsetLeft) / canvasScale;
            var y = (ev.pageY - ApartmentMap.canvas.offsetTop) / canvasScale;
        
            if (ApartmentMap.onClick)
                ApartmentMap.onClick(x, y);
        });

    },
    
	render: function( layoutPixelPosition)
	{
	    if (!this.layoutImage)
	        return;

	    if (!this.canvas.context2d)
	        this.canvas.context2d = this.canvas.getContext("2d");

        var ctx = this.canvas.context2d;
        ctx.clearRect ( 0 , 0 , this.canvas.width , this.canvas.height );
	    var canvasScale = Math.min( this.canvas.width  / this.layoutImage.width, 
	                                this.canvas.height / this.layoutImage.height);
	    ctx.globalAlpha = 0.5;
	    ctx.drawImage(this.layoutImage, 0, 0, this.layoutImage.width * canvasScale, this.layoutImage.height * canvasScale);
	    ctx.globalAlpha = 1.0;
	    
	    var pos = layoutPixelPosition;

	    pos[0] *= canvasScale;
	    pos[1] *= canvasScale;
        var RADIUS = this.canvas.width / 60;

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
        if (!this.layoutImage)
            return;

        var aspect = this.layoutImage.width / this.layoutImage.height;
        this.canvas.style.height = this.canvas.clientWidth / aspect + "px";
        this.canvas.height = this.canvas.clientHeight;
        this.canvas.width  = this.canvas.clientWidth;
    }
    
}

