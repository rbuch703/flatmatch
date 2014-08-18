"use strict"

function getDayOfYear( date ) {
    var year = new Date(date.getFullYear(), 0, 0);
    var dt = date.valueOf() - year.valueOf();  //milliseconds since beginning of year
    return dt/ (1000 * 24 * 60 * 60);
}



function Sun(lat, lng) {
    this.lat = lat;
    this.lng = lng;
    this.dayOfYear = 1;
    this.time = 12; //noon;
}

// source of computation: http://www.pveducation.org/pvcdrom/properties-of-sunlight/suns-position
Sun.prototype.getPosition = function() {
    var dtGmt = 1; //usually one hour time difference to GMT

    // day-of-the-year at which summer time begins. Technically, European summer time starts on the last Sunday in March. But since we do not want the user to have to enter a year, we'll just use the end of March as an approximation
    var summerTimeBegins = 31+28+31;
    // day-of-the-yeat at which summer time ends. We use the last of October as an approximation
    var summerTimeEnds = 365 - 31 - 30 - 31;
    
    if (this.dayOfYear > summerTimeBegins && this.dayOfYear < summerTimeEnds)
        dtGmt = 2;

    var LSTM = 15 * dtGmt; //Local Standard Time Meridian
    var B = (this.dayOfYear - 81) / 365 * 2 * Math.PI;
    
    var EoT = 9.87 * Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B); //Equation of Time;
    //console.log("EoT: %s", EoT);    
    var TC = 4 * (this.lng - LSTM) + EoT; // Time Correction Factor
    
    var LST = this.time + TC/60; //Local Solar Time
    
    var HRA = (15 * (LST - 12)) / 180 * Math.PI;  // Hour Angle in radiants
    var delta = (23.45 * Math.sin(B)) / 180 * Math.PI; // declination in radiants
    //console.log("Declination: %s", delta/Math.PI*180);
    
    var phi = this.lat / 180 * Math.PI;           // latitude in radiants
    
    var elevation = Math.asin( Math.sin(delta) * Math.sin(phi) + 
                               Math.cos(delta) * Math.cos(phi) * Math.cos(HRA));
                              
    var azimuth = Math.acos( (Math.sin(delta) * Math.cos(phi) - 
                              Math.cos(delta) * Math.sin(phi) * Math.cos(HRA)) /
                              Math.cos(elevation));
    
    if (HRA > 0) azimuth = 2 * Math.PI - azimuth;
    return {"elevation": elevation, "azimuth": azimuth};
}


