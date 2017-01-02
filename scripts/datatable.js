function getStyle(format)
{
    switch (format)
    {
        case "l": return "text-align:left"; 
        case "c": return "text-align:center"; 
        case "r": return "text-align:right"; 
    }
    return "";

}

function renderRow(row)
{
    var str = "";
    var tr = document.createElement("TR")
    for (i in this.config)
    {
        //console.log(row[i]);
        var cfg = this.config[i];
        var data = row[i];
        if (cfg[3]) data = cfg[3](data);
        
        //FIXME: replace by DOM operations to prevent XSRF attack
        str += "<td style='" + this.getStyle(cfg[1]) + "'>" + data + "</td>";
    }
    tr.innerHTML = str;
    this.tbody.appendChild(tr);
}

function addRow(row)
{
    this.data.push(row);
    this.renderRow(row);
}

function sortBy( column_id, descending)
{
    this.tbody.innerHTML = "";  //clear contents;
    
    var baseFunc =  typeof(this.config[column_id][2]) == "function" ?
                     this.config[column_id][2] :
                     function(a,b) {return a[column_id] < b[column_id] ? -1 : (a[column_id] == b[column_id] ? 0 : 1);};
    var func = descending ? function (a,b) {return - baseFunc(a,b);}: baseFunc;
    
    this.data.sort( func);
    
    for (i in this.data)
        this.renderRow( this.data[i]);
        
    //console.log(this.data.length)
}

function sortHelper(column_id)
{
    this.sortDescending = ! this.sortDescending;
    this.sortBy(column_id, this.sortDescending);
}

function clear()
{
    this.tbody.innerHTML = "";  //clear contents;
    this.data = [];    
}

function createDataTable(tbl, config)
{
    tbl.innerHTML = "<thead></thead><tbody></tbody>"
    tbl.thead = tbl.getElementsByTagName("thead")[0];
    //console.log(tbl.thead);
    
    tbl.tbody = tbl.getElementsByTagName("tbody")[0];
    //console.log(tbl.tbody);
    tbl.config = config;

    tbl.addRow = addRow;
    tbl.renderRow=renderRow;
    tbl.getStyle= getStyle;
    tbl.sortBy = sortBy;
    tbl.sortHelper= sortHelper;
    tbl.clear = clear;
    tbl.sortDescending = false;
    tbl.data = [];
    
    // [title, alignment, sort_method, display_method]
    
    var tr = document.createElement("TR");
    var s = "";
    for (i in config)
    {
        var a = document.createElement("A");
        var cfg = config[i];
        a.href = "#";
        //FIXME: sanatize against XSRF attacks
        a.text = config[i][0];
        a.column_id = i;
        
        a.addEventListener("click", function(ev){ 
            tbl.sortHelper(ev.target.column_id); 
            if (ev.stopPropagation)    ev.stopPropagation();    //cross-browser
            if (ev.cancelBubble!=null) ev.cancelBubble = true;  //IE < 9
        });
        var th = document.createElement("TH");
        th.style = getStyle(config[i][1]);
        th.appendChild(a);
        //tbl.sortDescending
        //FIXME: replace by DOM operations to prevent XSRF attack
        //s += "<th " +  + ">" + config[i][0] + "</th>";
        tr.appendChild(th);
    }
    
    //FIXME: replace by DOM operations to prevent XSRF attack
    tbl.thead.appendChild(tr);;
    //$(tbl.id).html("<tbody><tr><td>halo welt</td></tr></tbody>")
    /*for (var i in config)
    {
    }*/
    //tbl
}
