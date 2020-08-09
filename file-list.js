var API_KEY = "AIzaSyD1EvRZVQ891i-BAYedLwjklYrzLAC2oCw";

function getDataFromDescriptions(callback, id, mime) {
    var request = new XMLHttpRequest();
    request.open("GET", "https://www.googleapis.com/drive/v2/files?maxResults=70&orderBy=title&q='" + id + "'+in+parents&key=" + API_KEY);
    request.send();

    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) callback(getContentFromDescriptions(JSON.parse(request.responseText).items, mime));
        else if (this.readyState == 4) console.error("Error getting drive folder data: " + request.responseText);
    }
}

//Returns an array of arrays, containing each file's: date, chinese name, english name, alternate (view) link
function getDataFromNames(callback, id, mime, reverse) {
    var request = new XMLHttpRequest();
    request.open("GET", "https://www.googleapis.com/drive/v2/files?maxResults=70&orderBy=title+desc&q='" + id + "'+in+parents&key=" + API_KEY);
    request.send();

    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) callback(getContentFromNames(JSON.parse(request.responseText).items, mime, reverse));
        else if (this.readyState == 4) console.error("Error getting drive folder data: " + request.responseText + "\n.");
    }
}

function getContentFromDescriptions(folderContent, mime, reverse) {
    var items = filterByMIME(folderContent, mime);
    var res = [];
    for (var i = 0; i < items.length; i++) {
        var tmp = fromDescription(items[i].description);
        if (tmp == null) return;
        tmp.push(items[i].webContentLink);
        res.push(tmp);
    }
    //Sort files
    res.sort(function(a, b) {
        if (reverse) return a[0] - b[0];
        return b[0] - a[0];
    });

    return res;
}

function getContentFromNames(folderContent, mime, reverse) {

    var res = [];

    var items = filterByMIME(folderContent, mime);
    
    //Sort files by date
    items.sort(function(a, b) {
        if (reverse) return getDate(a.title)[0].getTime() - getDate(b.title)[0].getTime();
        return getDate(b.title)[0].getTime() - getDate(a.title)[0].getTime();
    });
    
    var itemNames = [];
    //Get item names after removing extensions
    for (var i = 0; i < items.length; i++) itemNames[i] = items[i].title.substring(0, items[i].title.lastIndexOf("."));
    
    for (var i = 0; i < itemNames.length; i++) {
        var tmp = getDate(itemNames[i]);
        var date = tmp[0];

        var cName = "", eName = "", index = tmp[1];
        while (index < itemNames[i].length && itemNames[i].charAt(index).match(/[a-zA-Z]/) == null) index++;

        cName = cTrim(itemNames[i].substring(tmp[1], index));
        eName = cTrim(itemNames[i].substring(index));
        res.push([date, cName, eName, items[i].alternateLink]);
    }
    return res;
}

function getDate(fileName) {
    var number = "";
    var index = 0;
    while (fileName.charAt(index).match(/[0-9 \/\-_]/) != null) {
        if (fileName.charAt(index).match(/[0-9]/) != null) number += fileName.charAt(index);
        index++;
    }

    try {
        //Find the date
        var y, m, d;
        
        if (number.length == 8 || number.length == 9) {
            //YYYYMMDD or MMDDYYYY or YYYYMMDDX or MMDDYYYYX
            if (parseInt(number.substring(0, 4), 10) >= 1970) {
                y = parseInt(number.substring(0, 4), 10);
                m = parseInt(number.substring(4, 6), 10);
                d = parseInt(number.substring(6, 8), 10);
            }
            else if (parseInt(number.substring(4, 8), 10) >= 1970) {
                y = parseInt(number.substring(4, 8), 10);
                m = parseInt(number.substring(0, 2), 10);
                d = parseInt(number.substring(2, 4), 10);
            }
            else {
                console.error("Could not identify a valid year (must be >= 1970).");
                return [new Date(1970, 0, 1), 0];
            }
        }
        else if (number.length == 6) {
            //YYYYMM or MMYYYY
            if (parseInt(number.substring(0, 4), 10) >= 1970) {
                y = parseInt(number.substring(0, 4), 10);
                m = parseInt(number.substring(4), 10);
                d = 1;
            }
            else if (parseInt(number.substring(2), 10) >= 1970) {
                y = parseInt(number.substring(2), 10);
                m = parseInt(number.substring(0, 2), 10);
                d = 1;
            }
            else {
                console.error("Could not identify a valid year (must be >= 1970).");
                return [new Date(1970, 0, 1), 0];
            }
        }
        else {
            console.error("Could not find date from file name '" + fileName + "'");
            return [new Date(1970, 0, 1), 0];
        }
        
        //Check to make sure it makes sense; doesn't check for special leap year rules, only 4 year cycles
        var dim = [0, 31, 28 + (y % 4 == 0 ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (y < 1970 || m < 1 || m > 12 || d < 1 || d > dim[m]) {
            console.error("Invalid date (must be either YYYYMMDD or MMDDYYYY, as well as an existing date). ");
            return [new Date(1970, 0, 1), 0];
        }

        //Return the new date, with month offset by 1 (stupid, I think, but whatever.)
        return [new Date(y, m - 1, d), index];
    }
    catch (err) {
        console.error("Could not find date from file name '" + fileName + "'");
        return [new Date(1970, 0, 1), 0];
    }
}

function fromDescription(item) {
    if (item == null) item = "^";
    try {
        var tmp = item.split("^");
        while (tmp.length < 6) tmp.push("");
        for (var j = 0; j < tmp.length; j++) tmp[j] = cTrim(tmp[j]);
        if (tmp[0].length == 0) tmp[0] = 0;
        if (tmp[1].length == 0) tmp[1] = 5;
        var d1 = getDate(tmp[2]), d2 = getDate(tmp[3]);
        tmp[2] = d1[1] == 0 ? (new Date(new Date("1/1/1970").getTime() + 2.0e+8)) : d1[0];
        tmp[3] = d2[1] == 0 ? (new Date(new Date().getTime() + 2.0e+8)) : d2[0];
        return tmp;
    }
    catch (err) {
        console.error("Could not parse description '" + item + "'.");
        return null;
    }
}

function cTrim(text) {
    return text.trim().replace(/_+$/, '').replace(/^_+/, '').replace(/-+$/, '').replace(/^-+/, '');
}

function filterByMIME(folderContent, mime) {
    if (mime.length == 0) return folderContent;
    var items = [];
    //Get all valid files
    for (var i = 0; i < folderContent.length; i++) {
        if (folderContent[i].kind != "drive#file") continue;
        for (var m = 0; m < mime.length; m++) {
            if (folderContent[i].mimeType.indexOf(mime[m]) != -1 || mime[m].indexOf(folderContent[i].mimeType) != -1) {
                items.push(folderContent[i]);
                break;
            }
        }
    }
    return items;
}
