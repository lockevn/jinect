/******************************************************/
/********Share function of HTML5, DOM, ... ***********************/
/******************************************************/


///////// 
// http: //stackoverflow.com/questions/2010892/storing-objects-in-html5-localstorage
Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

Storage.prototype.setValue = function (key, value) {
    this.setItem(key, value);
}

Storage.prototype.getValue = function (key) {
    var value = this.getItem(key);
    return value;
}


var Lib = {};
Lib.setCachedWord = function (wordToLookup, value) {
    return localStorage.setObject(CACHED_PREFIX + wordToLookup, value);
};
Lib.getCachedWord = function (wordToLookup) {
    return localStorage.getObject(CACHED_PREFIX + wordToLookup);
};
Lib.normalizeWord = function (word) {
    /* normalize, lowercase, trim start and trim end */
    return word.toLocaleLowerCase().replace(/^\s+|\s+$/g, '');
};



function hasGetUserMedia() {
    // Note: Opera builds are unprefixed.
    return !!(navigator.webkitGetUserMedia || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

var AudioContext = (window.AudioContext || window.webkitAudioContext || null);
function hasAudio() {
    return !!AudioContext;
}

function getSelectionText() {
    /*
    get current selection text in viewing page
    */

    // for CHROME only, performance
    return window.getSelection();
}


function checkEditable(target) {
    /*
    return true if current target is input or textarea
    */

    if (target.tagName == 'INPUT' || target.tagName == 'TEXTAREA') {
        return true;
    }

    return false;
}
