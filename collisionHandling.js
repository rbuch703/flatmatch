"use strict"    

var CollisionHandling = {

    map: null,
    
    init: function(layoutId) {
        /*CollisionHandling.layoutImage = new Image();
        CollisionHandling.layoutImage.onload = CollisionHandling.processLayout;
        CollisionHandling.layoutImage.src = OFFER_REST_BASE_URL + "/get/cleanedLayout/"+ layoutId;*/
        
    },
    
    processLayout: function(width, height, tmpData) {
        CollisionHandling.width = width;
        CollisionHandling.height =height;
        CollisionHandling.buffer = new ArrayBuffer(width*height);
        CollisionHandling.data = new Uint8Array(CollisionHandling.buffer);
        var i = 0;
        var val = 0;
        for (var j in tmpData)
        {
            var len = tmpData[j];
            while (len > 0)
            {
                CollisionHandling.data[i] = val;
                i+=1;
                len-=1;
            }
            val = !val;
        }
        console.log("final index: %s, size: %s", i, width*height);
    },
    
    moveAllowed: function(x,y)
    {
        return CollisionHandling.data[ Math.round(y-0.5)* CollisionHandling.width + Math.round(x-0.5)];
    }

}

