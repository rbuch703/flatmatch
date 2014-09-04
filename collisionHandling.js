"use strict"    

function fail(message)
{
    console.log(message);
    return undefined;
}

function frac(a)
{
    return a - (a|0);
}

function nextInteger(val, dir)
{
    if (val == (val | 0)) return val + (dir < 0 ? -1 : 1);
    
    if (dir < 0) return val | 0;
    return (val | 0) + 1;
}


var CollisionHandling = {

    map: null,
    
    init: function(width, height, rleCollisionMap) {
        CollisionHandling.width = width;
        CollisionHandling.height =height;
        CollisionHandling.buffer = new ArrayBuffer(width*height);
        CollisionHandling.data = new Uint8Array(CollisionHandling.buffer);
        var i = 0;
        var val = 0;
        for (var j in rleCollisionMap)
        {
            var len = rleCollisionMap[j];
            while (len > 0)
            {
                CollisionHandling.data[i] = val;
                i+=1;
                len-=1;
            }
            val = !val;
        }
        
    },

    toDataUrl: function()
    {
        
        var canvas= document.createElement("CANVAS");
        canvas.width = CollisionHandling.width;
        canvas.height= CollisionHandling.height;
        
        var ctx= canvas.getContext("2d");
        var data=ctx.getImageData(0, 0, CollisionHandling.width,CollisionHandling.height);
        
        for (var i = 0; i < CollisionHandling.width * CollisionHandling.height; i++)
        {
            var val = CollisionHandling.data[i] ? 255 : 0;
            data.data[i*4+0]=val;
            data.data[i*4+1]=val;
            data.data[i*4+2]=val;
            data.data[i*4+3]=255;
        }
        
        ctx.putImageData(data,0,0);
        var res = canvas.toDataURL();
        return res;
    },
   
    canGoHorizontal: function( x, y, dirH)
    {
        if (Math.abs(dirH) != 1) return fail("Invalid direction parameter");
        if ( frac(x) != 0) return true; //not on a vertical edge -> can go horizontally at least to till the next edge
        
        var nextX = dirH > 0 ? x : x-1;
        
        if ( frac(y) != 0)  // at the edge to a single pixel --> check whether that pixel is passable
            return CollisionHandling.moveAllowed( nextX|0, y|0);
            
        /* at an intersection between four pixels --> horizontal movement would move along an edge between two pixels
         * --> can go of at least one of the two is passable*/
         
        return CollisionHandling.moveAllowed( nextX|0, y|0) ||
               CollisionHandling.moveAllowed( nextX|0, (y-1)|0);
        
    },

    canGoVertical: function( x, y, dirV)
    {
        if (Math.abs(dirV) != 1) return fail("Invalid direction parameter");
        if ( frac(y) != 0) return true; //not on a vertical edge -> can go horizontally at least to till the next edge
        
        var nextY = dirV > 0 ? y : y-1;
        
        if ( frac(x) != 0)  // at the edge to a single pixel --> check whether that pixel is passable
            return CollisionHandling.moveAllowed( x|0, nextY|0);
            
        /* at an intersection between four pixels --> horizontal movement would move along an edge between two pixels
         * --> can go of at least one of the two is passable*/
         
        return CollisionHandling.moveAllowed(     x|0, nextY|0) ||
               CollisionHandling.moveAllowed( (x-1)|0, nextY|0);
        
    },

    /* High-level algorithm: The movement from 'start' to 'end' is split in a horizontal and a vertical part. 
     * Advance based on both parts simultaneously. Whenever there is an obstacle in the horizontal or vertical movement
     * direction, temporarily set that movement part to zero. If both parts are zero at the same time, return the 
     * current position as the movement end point. Otherwise walk as long (in movement time, not distance) as you would
     * if there where no obstacles. Then return your current position as the movement end point. */
   
    adjustMovement: function( start, end)
    {
        /* HACK: Round start and end points to 5 digits. The rationale is as follows:
         *       adjustMovement() requires pixel positions to be exact, and itself ensures that the positions
         *       it computes are exact. Even a shift by a tiny amount (e.g.: 1E-10) might move the current position
         *       into an impassable pixel, and thus make the player stuck. 
         *       The problem is that the collision handling computes the positions in layout image pixel coordinates,
         *       But the remaining application needs them in local coordinates in [m] ,so a conversion takes place in
         *       Controller. The numerical accuracy of this conversion pixel->local->pixel, however, may cause pixel
         *       positions to be off slightly, and thus to make the player stuck. Rounding the values corrects this.
         *       Rounding to five digits was a compromise chosen between guaranteeing that the numerical error is "healed" 
         *       while still having an unnoticably low effect on the actual positions
         */
        start[0] = Math.round(start[0] * 10000) / 10000;
        start[1] = Math.round(start[1] * 10000) / 10000;
        end[0]   = Math.round(end[0]   * 10000) / 10000;
        end[1]   = Math.round(end[1]   * 10000) / 10000;
        
        //console.log("[NFO] == testing path from (%s, %s) to (%s, %s)", start[0], start[1], end[0], end[1]);
        var vDir = [end[0] - start[0], end[1] - start[1]];
        var vInc = [start[0] < end[0] ? 1 : -1, start[1] < end[1] ? 1 : -1];
        var pathLength = Math.sqrt( dot2( vDir, vDir));
        if (pathLength == 0) return end;
        
        vDir = norm2(vDir);
        
        var pos = [start[0], start[1]];
        
        while (pathLength > 0)
        {
            var canGoHorizontal = CollisionHandling.canGoHorizontal( pos[0], pos[1], vInc[0]);
            var canGoVertical =   CollisionHandling.canGoVertical  ( pos[0], pos[1], vInc[1]);

            //console.log("[DBG] pos=(%s, %s) pathLength=%s, canGo=(%s, %s)", pos[0], pos[1], pathLength.toFixed(1), canGoHorizontal, canGoVertical);
        
            if (!canGoHorizontal && !canGoVertical) //dead end, stay here
                return pos;
        
            var vDirEff = [canGoHorizontal? vDir[0] : 0, canGoVertical? vDir[1] : 0];
            
            
            var edgePosX = nextInteger(pos[0], vInc[0]);
            var edgePosY = nextInteger(pos[1], vInc[1]);
        
            var alphaX = (edgePosX - pos[0])/ vDirEff[0];
            var alphaY = (edgePosY - pos[1])/ vDirEff[1];
            
            if (alphaX == -Infinity) alphaX = Infinity;
            if (alphaY == -Infinity) alphaY = Infinity;
            
            if (alphaX < 0 || alphaY < 0) return fail("Invalid movement direction");
            
            var alpha = Math.min(alphaX, alphaY);
            
            if (alpha == Infinity) return pos;

            if (alpha == 0) return fail("Invalid movement distance");
            
            if (alpha < pathLength)
            {
                pathLength -= alpha;
                 
                //Theoretically, '(pos[0] + alpha * vDirEff[0])' would be valid for all cases, even if alpha==alphaX.
                //But due to numerical inaccuracy, that case may not return an integer number (which would be the exact result in that case)
                //and our algorithm requires either one of pos[0] or pos[1] to be an integer after each movement step
                pos[0] = (alpha == alphaX) ? edgePosX : (pos[0] + alpha * vDirEff[0]);
                pos[1] = (alpha == alphaY) ? edgePosY : (pos[1] + alpha * vDirEff[1]);
            } else
            {
                return [ pos[0] + pathLength * vDirEff[0], pos[1] + pathLength * vDirEff[1] ];
            }

        }
        return pos;
    },

/*    
    adjustMove: function( start, end)
    {
        var vDir = [end[0] - start[0], end[1] - start[1]];
        var vInc = [start[0] < end[0] ? 1 : -1, start[1] < end[1] ? 1 : -1];
        var pathLength = Math.sqrt( dot2( vDir, vDir));
        if (pathLength == 0) return end;
        
        vDir = norm2(vDir);
        
        pos = [start[0], start[1]];
        
        while (pathLength > 0)
        {
            var thisPixel = [pos[0] | 0, pos[1] | 0];
            var nextX = thisPixel[0] + vInc[0];
            var nextY = thisPixel[1] + vInc[1];
            
            var alphaX = (nextX - pos[0])/ vDir[0];
            var alphaY = (nextY - pos[1])/ vDir[1];
            if (alphaX < 0 || alphaY < 0) return fail("Invalid movement direction");
            
            if (alphaX < pathLength && alphaY < pathLength) //won't cross any more pixels till the end of the path
            {
                var alpha = Math.min(alphaX, alphaY);
                return [pos[0] + vDir[0] * alpha, pos[1] + vDir[1] * alpha];
            }
            console.log("alphaX=%s, alphaY=%s", alphaX, alphaY);
            if (alphaX < alphaY)    //next pixel on movement edge is the horizontal neighbor
            {
                console.log("Next pixel is (%s, %s)", nextX, thisPixel[1] );
                if ( CollisionHandler.moveAllowed( nextX, thisPixel[1] ) )
                {
                    pos = [nextX, pos[1] + alphaX * vDir[1]];
                    console.log("Move allowed, moving to (%s, %s)", pos[0], pos[1] );
                    pathLength -= alpha;
                } else  //move not allowed
                {
                    if (!CollisionHandler.moveAllowed( thisPixel[0], nextY)
                        return pos;

                    vDiversionDir = [0, vInc[1]];
                    var v = vDir[1] * vInc[1]; //the fraction of 1px by which one moves in 'diversion' direction while moving 1px in vDir.
                    
                    pos[0] = nextX - 1E-5;
                    
                    var distY
                    if ( v < 1)
                        return( nextX - 1E-5, pos[1] + vInc[1] * pathLength * v);
                    
                    pos = [ nextX - 1E-5, nextY ];
                    pathLength -= Math.abs( 
                }
            } else                  //next pixel on movement edge is the vertical neighbor
            {
            }
            
        }
        
        
        while ( vDir[0] != 0 || vDir[1] != 0)
        {
    
    }*/
    
    moveAllowed: function(x,y)
    {
        return !!CollisionHandling.data[ (y|0)* CollisionHandling.width + (x|0)];
    }

}

