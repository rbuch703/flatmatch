"use strict"

var VicinityMap = {
    
    init: function(div, lat, lng)
    {
        //console.log(lat, lng);
        VicinityMap.map = L.map(div, {keyboard:false} ).setView([lat, lng], 18);
        VicinityMap.map.on("click", VicinityMap.onMapClick);
        VicinityMap.map.on("zoomend", VicinityMap.renderFrustum);

        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 19, minZoom:0
        }).addTo(VicinityMap.map);

        L.control.scale({imperial:false, position:"topright"}).addTo(VicinityMap.map);
    },

    updatePositionMarker: function(newPos)
    {
        if (!VicinityMap.map)  //not yet initialized
            return;
            
        if (VicinityMap.positionMarker)
            VicinityMap.map.removeLayer(VicinityMap.positionMarker);
        
        VicinityMap.positionMarker = L.marker( newPos );
        VicinityMap.positionMarker.addTo(VicinityMap.map);//.bindPopup("You are here");
    },

    
	renderFrustum: function()
	{
        if (!VicinityMap.map)  //not yet initialized
            return;


	    if (VicinityMap.frustum)
	    {
	        VicinityMap.map.removeLayer(VicinityMap.frustum);
	        VicinityMap.frustum = null;
        }
	    
	    var effectivePosition = Controller.getEffectivePosition();
	    
	    /* One degree latitude on earth always corresponds to the same distance in meters ( 1/360th of the earth circumference).
	     * But the distance of one degree longitude changes depending of the current latitude.
	     * This aspect is the ration between the two distances. It is needed to correctly
	     * draw that viewing frustum, which needs to be specified in lat/lnt
	    */
	    var localAspect = Math.cos( effectivePosition.lat / 180 * Math.PI);
	    
        var yawRad = Controller.viewAngleYaw / 180 * Math.PI;
        /* compute only planar lookDir (ignoring pitch), as this is the relevant direction to render the frustum
           on a 2D map
         */
        var lookDir = [Math.sin( yawRad), Math.cos(yawRad)];
	    
	    //console.log ("local aspect ratio at %s is %s", position.lat, localAspect );
	    
	    //console.log( webGlCanvas.height, webGlCanvas.width, fieldOfView / webGlCanvas.height * webGlCanvas.width);
	    var phi = (0.5 * fieldOfView / webGlCanvas.height * webGlCanvas.width ) / 180 * Math.PI;
	    var leftDir = [ Math.cos(phi) * lookDir[0]  - Math.sin(phi) * lookDir[1], 
	                    Math.sin(phi) * lookDir[0]  + Math.cos(phi) * lookDir[1] ];
	    var rightDir =[ Math.cos(-phi) * lookDir[0] - Math.sin(-phi) * lookDir[1], 
	                    Math.sin(-phi) * lookDir[0] + Math.cos(-phi) * lookDir[1] ];

        var len = Math.pow(0.5, VicinityMap.map.getZoom())*2000;
        //console.log(map.getZoom(), len);
	    var pA = { lat: effectivePosition.lat + leftDir[1]*len*localAspect,  lng: effectivePosition.lng + leftDir[0]*len };
	    var pB = { lat: effectivePosition.lat + rightDir[1]*len*localAspect, lng: effectivePosition.lng + rightDir[0]*len};
	    var line = [effectivePosition, pA, pB, effectivePosition ]
	    VicinityMap.frustum = L.polygon(line, {color: 'red', noClip: 'true', fillColor:"white", fillOpacity:0.4}).addTo(VicinityMap.map);
	},

    onMapClick: function(e)
    {
        /*var dLat = e.latlng.lat - Controller.position.lat;
        var dLng = e.latlng.lng - Controller.position.lng;

        var earthCircumference = 2 * Math.PI * (6378.1 * 1000);
        var metersPerDegreeLat = earthCircumference / 360;
        var metersPerDegreeLng = metersPerDegreeLat * Math.cos( Controller.position.lat / 180 * Math.PI);
        
        var dx = dLng * metersPerDegreeLng - Controller.localPosition.x;
        var dy = dLat * metersPerDegreeLat - Controller.localPosition.y;
        var dYaw = -(Math.atan2(dy, dx) / Math.PI * 180 - 90);
        //console.log(e.latlng.lat, e.latlng.lng, dYaw);
        yawLog.innerHTML = "./setApartmentYaw.py " + rowId + " " + dYaw.toFixed(1);
        posLog.innerHTML = "./setApartmentPosition.py " + rowId + " " + e.latlng.lat + " " + e.latlng.lng;
        */
        
        /*Controller.position = e.latlng;
        onChangeLocation();*/
    }   


}
