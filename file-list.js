var API_KEY = "AIzaSyD1EvRZVQ891i-BAYedLwjklYrzLAC2oCw";

function cTrim(text) {
    return text.trim().replace(/_+$/, '').replace(/^_+/, '').replace(/-+$/, '').replace(/^-+/, '');
}

function getData(callback, id, mime) {
    var request = new XMLHttpRequest();
    request.open("GET", "https://www.googleapis.com/drive/v2/files?q='" + id + "'+in+parents&key=" + API_KEY);
    request.send();

    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) callback(getContent(JSON.parse(request.responseText).items, mime));
        else if (this.readyState == 4) console.error("Error getting drive folder data: " + request.responseText);
    }
}

function getContent(folderContent, mime) {
    var res = [];
    var items = [];
    //Get all valid files
    for (var i = 0; i < folderContent.length; i++) {
        if (folderContent[i].kind == "drive#file" && folderContent[i].mimeType.includes(mime)) items.push(folderContent[i]);
    }

    //Sort files by date
    items.sort(function(a, b) {
        return getDate(b.title)[0].getTime() - getDate(a.title)[0].getTime();
    });

    var itemNames = [];
    //Get item names after removing extensions
    for (var i = 0; i < items.length; i++) itemNames[i] = items[i].title.substring(0, items[i].title.lastIndexOf("."));

    for (var i = 0; i < itemNames.length; i++) {
        var tmp = getDate(itemNames[i]);
        if (tmp[1] == -1) continue;
        var date = tmp[0];

        var cName = "", eName = "", index = tmp[1];
        while (index < itemNames[i].length && itemNames[i].charAt(index).match(/[a-zA-Z]/) == null) index++;

        //The chinese name is second, and could have index errors.
        if (index != itemNames[i].length) cName = cTrim(itemNames[i].substring(index));
        eName = cTrim(itemNames[i].substring(tmp[1], index));

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
                return [new Date(1970, 1, 1), -1];
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
                return [new Date(1970, 1, 1), -1];
            }
        }
        else {
            console.error("Could not find date from file name '" + fileName + "'");
            return [new Date(1970, 1, 1), -1];
        }
        
        //Check to make sure it makes sense; doesn't check for special leap year rules, only 4 year cycles
        var dim = [0, 31, 28 + (y % 4 == 0 ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (y <= 1970 || m < 1 || m > 12 || d < 1 || d > dim[m]) {
            console.error("Invalid date (must be either YYYYMMDD or MMDDYYYY, as well as an existing date).");
            return [new Date(1970, 1, 1), -1];
        }

        //Return the new date, with month offset by 1 (stupid, I think, but whatever.)
        return [new Date(y, m - 1, d), index];
    }
    catch (err) {
        console.error("Could not find date from file name '" + fileName + "'");
        return [new Date(1970, 1, 1), -1];
    }
}