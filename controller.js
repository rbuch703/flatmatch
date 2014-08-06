"use strict"    

function getSign(pos, neg)
{
    if (pos && (!neg)) return  1;
    if (neg && (!pos)) return -1;
    return 0;
}


var Controller = {

    position: {"lat": 0, "lng": 0},
    localPosition : { x:0, y:0, z: 1.5+10 }, //camera position in the local coordinate system ('z' is height)
    viewAngleYaw : 0,
    viewAnglePitch : 0,


    getEffectivePosition : function() 
    {
        var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
        var metersPerDegreeLat = earthCircumference / 360;
        var metersPerDegreeLng = metersPerDegreeLat * Math.cos( this.position.lat / 180 * Math.PI);

        return {lat: this.position.lat + this.localPosition.y / metersPerDegreeLat,
                lng: this.position.lng + this.localPosition.x / metersPerDegreeLng};
        
    },

    buildQueryString: function(lat, lng)
    {
        var lat, lng;
        if (!lat) lat = this.position.lat;
        if (!lng) lng = this.position.lng;
        
        return "?lat=" + lat.toFixed(8) +
               "&lng=" + lng.toFixed(8) +
               "&yaw="+this.viewAngleYaw.toFixed(1)+
               "&pitch="+this.viewAnglePitch.toFixed(1);
    },

    initFromQueryString: function(queryString)
    {
        var query = this.toDictionary(queryString);
        if (query.lat && query.lng)
        {
            this.position = {lat:query.lat, lng:query.lng};
            
            if ( ("yaw" in  query) && ("pitch" in query) ) //if look direction is also given
            {
                this.viewAngleYaw = query.yaw;
                this.viewAnglePitch=query.pitch;
            }
        }
    },

    toDictionary: function(queryString)
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
    },
    
    

	onMouseDown: function(e)
	{
	    if (e.button != 0) 
	        return;

	    this.x = e.clientX;
	    this.y = e.clientY;
	    this.down = "mouse";
	},
	
	onMouseUp: function(e)
	{
	    if (e.button != 0) 
	        return;
	    this.down = null;
	},
	
	keysDown: {},
	
	lastKeyEventProcessed: null,

    turn: function(yaw, pitch)
    {
        this.viewAngleYaw += yaw;
        this.viewAnglePitch += pitch;
    },
    
    move: function(dx, dy)
    {
        var arc = this.viewAngleYaw / 180 * Math.PI;
        var forwardX = Math.sin(arc);
        var forwardY = Math.cos(arc);

        var rightX = Math.sin(arc + Math.PI/2.0);
        var rightY = Math.cos(arc + Math.PI/2.0);
        
        this.localPosition.x += dx*rightX;
        this.localPosition.y += dx*rightY;
        
        this.localPosition.x += dy*forwardX;
        this.localPosition.y += dy*forwardY;
   
    },
	
	updateKeyInteraction: function()
	{
        var now = new Date().getTime();
        var dt = now - this.lastKeyEventProcessed;
        this.lastKeyEventProcessed = now;

        if (this.lastKeyEventProcessed === null)
        {
            this.lastKeyEventProcessed = now;
            return;
        }


        var dy = dt/400 * getSign(("W" in this.keysDown) || ("up" in this.keysDown), 
                                  ("S" in this.keysDown) || ("down" in this.keysDown));
                                  
        var dx = dt/400 * getSign( "D" in this.keysDown, "A" in this.keysDown);

        this.move(dx, dy);

        
        var turnX = dt/10 * getSign( "right" in this.keysDown, "left" in this.keysDown );

        var turnY = 0;
        if (this.keysStillPressed() && this.down != "mouse" && Math.abs(this.viewAnglePitch) > 1)
            turnY = (this.viewAnglePitch < 0 ? 1 : -1) * dt/40;

        this.turn(turnX, turnY);

        
        this.updateHistoryState();
	},
	
	x:null,
	y:null,
	//id of the touch event that is currently tracked as 'down'; "mouse" if the mouse is tracked, null if none
    down: null,
    
	onKeyDown: function(evt) 
	{
        var key = null;
        switch (evt.keyCode)
        {
            
            case 65: key = "A"; break;
            case 68: key = "D"; break;
            case 83: key = "S"; break;
            case 87: key = "W"; break;
            case 37: key = "left"; break;
            case 38: key = "up"; break;
            case 39: key = "right";break;
            case 40: key = "down"; break;

        }
        
        if (key in this.keysDown) //is just a reoccuring event for a key that is still pressed
            return;

        if (key != null)
        {            
            this.updateKeyInteraction();
            this.keysDown[key] = key;
        }
        
        if (this.onRequestFrameRender)
            this.onRequestFrameRender();

    },

	onKeyUp: function(evt)
	{
        switch (evt.keyCode)
        {
            
            case 65: delete this.keysDown.A;     break;
            case 68: delete this.keysDown.D;     break;
            case 83: delete this.keysDown.S;     break;
            case 87: delete this.keysDown.W;     break;
            case 37: delete this.keysDown.left;  break;
            case 38: delete this.keysDown.up;    break;
            case 39: delete this.keysDown.right; break;
            case 40: delete this.keysDown.down;  break;
        }
    },
    
    keysStillPressed: function()
    {
        return Object.keys(this.keysDown).length > 0;
    },
	
    onMouseMove: function(e)
	{
	    //e.preventDefault();
        if (this.down != "mouse" ) return;
        var dx = e.clientX - this.x;
        var dy = e.clientY - this.y;

        this.x = e.clientX;
        this.y = e.clientY;

        this.turn(dx / 5.0, - dy / 5.0);
        
        this.updateHistoryState();
        if (this.onRequestFrameRender)
            this.onRequestFrameRender();

	},

    getTouchData: function(touches, identifier)
    {
        for (var i in touches)
        {
            if (touches[i].identifier == identifier)
            {
                return touches[i];
            }
        }
        return null;
    },
    
    onTouchDown: function(ev)
    {
        ev.preventDefault();
        var touch = ev.changedTouches[0];
        this.down = touch.identifier;
        this.x = touch.clientX;
        this.y = touch.clientY;
    },
    
    onTouchEnd: function(ev)
    {
    
        ev.preventDefault();
        if (this.getTouchData(ev.changedTouches, this.down))
        {
            this.down = null;
        }
    },

    onTouchMove: function(ev)
    {
    
        ev.preventDefault();
        var touch = this.getTouchData(ev.changedTouches, this.down);
        if (!touch)
            return;
            
        var dx = touch.clientX - this.x;
        var dy = touch.clientY - this.y;

        this.x = touch.clientX;
        this.y = touch.clientY;
        this.move(0,        -dy / 100.0);
        this.turn(dx / 5.0, 0       );

        this.updateHistoryState();
        if (this.onRequestFrameRender)
            this.onRequestFrameRender();
    },
    
   
    updateTimeoutId: null,
    // schedules a history state update so that the update is performed once no
    // update request has been made for a second (1000ms). This keeps the history state
    // reasonably up-to-date while preventing excessive history state updates (which incur
    // a performance penalty at least in Firefox).
    updateHistoryState : function()
    {
        if (this.updateTimeoutId)
            window.clearTimeout(this.updateTimeoutId);
        
        this.updateTimeoutId = window.setTimeout( function() 
            {
                /*
                var url = document.URL;
                if (url.indexOf("?") >= 0) // already contains a query string --> remove it
                    url = url.substring(0, url.indexOf("?"));
                
                var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
                var metersPerDegreeLat = earthCircumference / 360;
                var metersPerDegreeLng = metersPerDegreeLat * Math.cos( Controller.position.lat / 180 * Math.PI);
                //console.log("Resolution x: %s m/°, y: %s m/°", metersPerDegreeLng, metersPerDegreeLat);

                url += Controller.buildQueryString(Controller.position.lat + Controller.localPosition.y / metersPerDegreeLat, 
                                                   Controller.position.lng + Controller.localPosition.x / metersPerDegreeLng );

                history.replaceState(null, document.title, url);*/
            },1000);
    }
}

