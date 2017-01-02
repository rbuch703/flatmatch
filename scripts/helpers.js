"use strict"

function roundPrice(price)
{
    if (price < 1000) return Math.floor( price/10)*10;
    if (price < 2000) return Math.floor( price/20)*20;
    return Math.floor( price/50)*50;
}

function getPriceRangeString(minPrice, maxPrice)
{
    if ((minPrice == 0) && (maxPrice == MAX_PRICE))
        return "beliebig";
    else if (minPrice == 0)
        return "höchstens " + roundPrice(maxPrice) + "€";
    else if (maxPrice == MAX_PRICE)
        return "mindestens " + roundPrice(minPrice) + "€";
    else                
        return roundPrice(minPrice)+ "€ - " + roundPrice(maxPrice) + "€";
}

function getRoomRangeString( roomBounds)
{
    var minRooms = roomBounds[0];
    var maxRooms = roomBounds[1];
    if (maxRooms == 8) maxRooms = "7+";
    if (minRooms == 8) minRooms = "7+";

    if ((minRooms == 1) && (maxRooms == "7+"))
        return "beliebig";
    else if ((minRooms == "7+") && (maxRooms == "7+"))
        return "mehr als 7";
    else if (minRooms == maxRooms)
        return minRooms;
    else if (minRooms == 1)
        return "höchstens " + maxRooms;
    else if (maxRooms == "7+")
        return "mindestens " + minRooms;
    else
        return minRooms + " - " + maxRooms;

}

function getAreaRangeString( areaBounds)
{
    var minArea = areaBounds[0];
    var maxArea = areaBounds[1];
    
    if ((minArea == 20) && (maxArea == "120"))
        return "beliebig";
    else if (minArea == maxArea)
        return minArea +"m²";
    else if (minArea == 20)
        return "höchstens " + maxArea +"m²";
    else if (maxArea == "120")
        return "mindestens " + minArea + "m²";
    else
        return minArea + "m² - " + maxArea + "m²";
}

function getFloorName( level)
{
    if (level == 0) return "Erdgeschoss";
    if (level > 0) return level + ". Etage";
    if (level < 0) return level + ". Untergeschoss";
}

function asPriceString( val)
{
    var tmp = Math.floor(val * 100);
    var res = Math.floor(tmp / 100);
    tmp = tmp % 100;
    if (tmp < 10) tmp = "0" + tmp;
    return res + "," + tmp + " €";
}


function appendPropertyRow(el, property, value)
{
    var s = document.createElement("SPAN");
    s.className = "bold";
    s.textContent = property + ": ";
    el.appendChild(s);
    
    var s = document.createElement("SPAN");
    s.textContent = value;
    el.appendChild(s);

    el.appendChild(document.createElement("BR"));
}

function createOfferBlock(offer)
{
    //console.log(offer);
    var block = document.createElement("DIV");
    block.className = "offerBlock"
    
    var title = document.createElement("DIV");
    title.className = "offerTitle";
    title.textContent = offer.address;
    block.appendChild(title);
    
    var content = document.createElement("DIV");
    content.className = "offerContent";
    block.appendChild(content);
    
    appendPropertyRow(content, "Größe", offer.area + "m², " + offer.numRooms + " Zimmer");
    appendPropertyRow(content, "Kosten/Monat", asPriceString(offer.rent) /*+ "(KM+NK)"*/);
    appendPropertyRow(content, "Stockwerk", getFloorName(offer.level));
    appendPropertyRow(content, "Anbieter", offer.landlord);
    
    var a = document.createElement("A");
    a.target = "_blank";
    a.href = "flatview.html?rowid=" + offer.rowid;
    a.textContent = "Details und 3D-Ansicht";
    a.className = "footerAnchor"
    content.appendChild(a);
    
    block.offer = offer;
    
    
    return block;
}

