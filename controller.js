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
        var metersPerDegreeLng = metersPerDegreeLat * Math.cos( Controller.position.lat / 180 * Math.PI);

        return {lat: Controller.position.lat + Controller.localPosition.y / metersPerDegreeLat,
                lng: Controller.position.lng + Controller.localPosition.x / metersPerDegreeLng};
    },
    
    getLocalPosition: function()
    {
        return [Controller.localPosition.x, Controller.localPosition.y, Controller.localPosition.z];
    },

    buildQueryString: function(lat, lng)
    {
        var lat, lng;
        if (!lat) lat = Controller.position.lat;
        if (!lng) lng = Controller.position.lng;
        
        return "?lat=" + lat.toFixed(8) +
               "&lng=" + lng.toFixed(8) +
               "&yaw="+Controller.viewAngleYaw.toFixed(1)+
               "&pitch="+Controller.viewAnglePitch.toFixed(1);
    },

    initFromQueryString: function(queryString)
    {
        var query = Controller.toDictionary(queryString);
        if (query.lat && query.lng)
        {
            Controller.position = {lat:query.lat, lng:query.lng};
            
            if ( ("yaw" in  query) && ("pitch" in query) ) //if look direction is also given
            {
                Controller.viewAngleYaw = query.yaw;
                Controller.viewAnglePitch=query.pitch;
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

	    Controller.x = e.clientX;
	    Controller.y = e.clientY;
	    Controller.down = "mouse";
	},
	
	onMouseUp: function(e)
	{
	    if (e.button != 0) 
	        return;
	    Controller.down = null;
	},
	
	keysDown: {},
	
	lastKeyEventProcessed: null,

    turn: function(yaw, pitch)
    {
        Controller.viewAngleYaw = Controller.viewAngleYaw % 360;
        
        Controller.viewAngleYaw += yaw;
        Controller.viewAnglePitch += pitch;
        
        if (Controller.viewAnglePitch > 60)
            Controller.viewAnglePitch = 60;
        if (Controller.viewAnglePitch < -60)
            Controller.viewAnglePitch = -60;
    },
    
    move: function(dRight, dForward)
    {
        var arc = Controller.viewAngleYaw / 180 * Math.PI;
        var forwardX = Math.sin(arc);
        var forwardY = Math.cos(arc);

        var rightX = Math.sin(arc + Math.PI/2.0);
        var rightY = Math.cos(arc + Math.PI/2.0);
        
        var dx = dRight*rightX + dForward*forwardX;
        var dy = dRight*rightY + dForward*forwardY;

        if (!mapApartment)
            return;
            
        var newPixelPos = mapApartment.localToPixelCoordinates( {x:Controller.localPosition.x + dx, y: Controller.localPosition.y + dy} );
        //console.log("newPixelPos: %o", newPixelPos);
        if (!CollisionHandling.moveAllowed( newPixelPos[0], newPixelPos[1]))
            return;

        Controller.localPosition.x += dx;
        Controller.localPosition.y += dy;
   
    },
    
    moveTo: function(localX, localY)
    {
        var newPixelPos = mapApartment.localToPixelCoordinates( {x:localX, y: localY} );
        //console.log("newPixelPos: %o", newPixelPos);
        if (!CollisionHandling.moveAllowed( newPixelPos[0], newPixelPos[1]))
            return;

        Controller.localPosition.x = localX;
        Controller.localPosition.y = localY;
    
    },
	
	updateKeyInteraction: function()
	{
        var now = new Date().getTime();

        //nothing to track anymore --> reset state
        if (!Controller.keysStillPressed())
        {
            Controller.lastKeyEventProcessed = null;
            return;
        }

        // Nothing tracked yet --> initialize state, but do nothing else.
        // (there is not yet a 'dt' that we could base computations on)
        if (Controller.lastKeyEventProcessed === null)
        {
            Controller.lastKeyEventProcessed = now;
            return;
        }

        var dt = now - Controller.lastKeyEventProcessed;

        Controller.lastKeyEventProcessed = now;

        if (dt > 1000)
        {
            console.log("[WARN] extensive time step (%s ms)", dt);
            dt = 1000;
        }

        var dy = dt/400 * getSign(("W" in Controller.keysDown) || ("up" in Controller.keysDown), 
                                  ("S" in Controller.keysDown) || ("down" in Controller.keysDown));
                                  
        var dx = dt/400 * getSign( "D" in Controller.keysDown, "A" in Controller.keysDown);

        Controller.move(dx, dy);

        
        var turnX = dt/10 * getSign( "right" in Controller.keysDown, "left" in Controller.keysDown );

        var turnY = 0;
        if (Controller.keysStillPressed() && Controller.down != "mouse" && Math.abs(Controller.viewAnglePitch) > 1)
            turnY = (Controller.viewAnglePitch < 0 ? 1 : -1) * dt/40;

        Controller.turn(turnX, turnY);

        Controller.updateHistoryState();
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
        
        if (key in Controller.keysDown) //is just a reoccuring event for a key that is still pressed
            return;

        if (key != null)
        {            
            Controller.updateKeyInteraction();
            Controller.keysDown[key] = key;
        }
        
        if (Controller.onRequestFrameRender)
            Controller.onRequestFrameRender();

    },

	onKeyUp: function(evt)
	{
        switch (evt.keyCode)
        {
            
            case 65: delete Controller.keysDown.A;     break;
            case 68: delete Controller.keysDown.D;     break;
            case 83: delete Controller.keysDown.S;     break;
            case 87: delete Controller.keysDown.W;     break;
            case 37: delete Controller.keysDown.left;  break;
            case 38: delete Controller.keysDown.up;    break;
            case 39: delete Controller.keysDown.right; break;
            case 40: delete Controller.keysDown.down;  break;
        }
        Controller.updateKeyInteraction();
    },
    
    keysStillPressed: function()
    {
        return Object.keys(Controller.keysDown).length > 0;
    },
	
    onMouseMove: function(e)
	{
	    //e.preventDefault();
        if (Controller.down != "mouse" ) return;
        var dx = e.clientX - Controller.x;
        var dy = e.clientY - Controller.y;

        Controller.x = e.clientX;
        Controller.y = e.clientY;

        Controller.turn(dx / 5.0, - dy / 5.0);
        
        Controller.updateHistoryState();
        if (Controller.onRequestFrameRender)
            Controller.onRequestFrameRender();

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
        Controller.down = touch.identifier;
        Controller.x = touch.clientX;
        Controller.y = touch.clientY;
    },
    
    onTouchEnd: function(ev)
    {
    
        ev.preventDefault();
        if (Controller.getTouchData(ev.changedTouches, Controller.down))
        {
            Controller.down = null;
        }
    },

    onTouchMove: function(ev)
    {
    
        ev.preventDefault();
        var touch = Controller.getTouchData(ev.changedTouches, Controller.down);
        if (!touch)
            return;
            
        var dx = touch.clientX - Controller.x;
        var dy = touch.clientY - Controller.y;

        Controller.x = touch.clientX;
        Controller.y = touch.clientY;
        Controller.move(0,        -dy / 100.0);
        Controller.turn(dx / 5.0, 0       );

        Controller.updateHistoryState();
        if (Controller.onRequestFrameRender)
            Controller.onRequestFrameRender();
    },
    
   
    updateTimeoutId: null,
    // schedules a history state update so that the update is performed once no
    // update request has been made for a second (1000ms). This keeps the history state
    // reasonably up-to-date while preventing excessive history state updates (which incur
    // a performance penalty at least in Firefox).
    updateHistoryState : function()
    {
        if (Controller.updateTimeoutId)
            window.clearTimeout(Controller.updateTimeoutId);
        
        Controller.updateTimeoutId = window.setTimeout( function() 
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

