"use strict"

function FullScreenButton(element, config)
{
    this.config = config;
    this.config.element = element;
    this.isFullScreen = false;
    
    element.width = 32;
    element.height = 32;
    element.src = config.icon;
	element.addEventListener("click", this.onToggleFullScreen.bind(this), false);

    document.addEventListener("fullscreenchange", this.onFullScreenToogled.bind(this), false);
    document.addEventListener("mozfullscreenchange", this.onFullScreenToogled.bind(this), false);
    document.addEventListener("webkitfullscreenchange", this.onFullScreenToogled.bind(this), false);
    document.addEventListener("msfullscreenchange", this.onFullScreenToogled.bind(this), false);


}

FullScreenButton.prototype.getFullScreenElement = function() {
    //FIXME: check capitalization of document.fullscreenElement
    return document.fullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullScreenElement ||
           document.webkitFullscreenElement;
}

FullScreenButton.prototype.requestFullScreenMode = function(elem)
{
    var requestMethod = elem.requestFullscreen || elem.msRequestFullscreen || elem.mozRequestFullScreen || elem.webkitRequestFullscreen;

    if (requestMethod)
        requestMethod.bind(elem)();
}

FullScreenButton.prototype.exitFullScreenMode = function(elem)
{
    var exitMethod = document.cancelFullScreen || 
                     document.msCancelFullScreen || 
                     document.mozCancelFullScreen || 
                     document.webkitCancelFullScreen;
    
    console.log("Fullscreen exit method is %o", exitMethod);
    if (exitMethod)
        exitMethod.bind(document)();
}


FullScreenButton.prototype.onToggleFullScreen = function()
{
    if (!this.isFullScreen)
        this.requestFullScreenMode( this.config.target);
    else
        this.exitFullScreenMode( this.config.target);
}

FullScreenButton.prototype.onFullScreenToogled = function()
{
    console.log("fullscreen toggled");
    this.isFullScreen = (this.getFullScreenElement() === this.config.target);
    this.config.element.src = this.isFullScreen ? this.config.returnIcon : this.config.icon;
    
}


/// =============================================================

function ToolWindowBar(element, config)
{
    this.element = element;
    this.config  = config;
    
    for (var i in config.windows)
    {
        var dist = document.createElement("SPAN");
        dist.style.marginLeft = "5px";
        element.appendChild(dist);


        var window = config.windows[i];
        window.img = new Image();
        window.img.width = 32;
        window.img.height= 32;
        window.img.style.margin = "2px";
//        window.img.style.border = "1px solid #555";
        window.img.style.backgroundColor = "white";
        window.img.src = window.icon;
        window.img.addEventListener("click", this.createOnClickFunction(window.img));
        window.tabVisible = false;
        element.appendChild(window.img);
        window.target.style.display = "none";
    }
}

ToolWindowBar.prototype.createOnClickFunction = function(img)
{
    var bar = this;
    return function(ev) { bar.onButtonClicked(bar, img, ev) };
}

ToolWindowBar.prototype.onButtonClicked = function(bar, img, ev)
{
    var tabToBeEnabled = null;
    for (var i in this.config.windows)
    {
        var window = this.config.windows[i];
        if (img == window.img && !window.tabVisible)
            tabToBeEnabled = window;
    }
    
    for (var i in this.config.windows)
    {
        var window = this.config.windows[i];
        window.img.style.border = "";
        window.img.style.margin = "2px";
        window.target.style.display = "none";
        window.tabVisible = false;
    }
    
    if (tabToBeEnabled)
    {
        tabToBeEnabled.img.style.border = "2px solid #C55";
        tabToBeEnabled.img.style.margin = "0px";

        tabToBeEnabled.target.style.display = "block";
        tabToBeEnabled.tabVisible = true;
        if (tabToBeEnabled.onShow)
            tabToBeEnabled.onShow();
    }
    
}

