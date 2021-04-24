// GLOBAL VAR, data across the apps
// Don't store function, share function here

var NOTIFICATION_TIMEOUT = 105555;
var CACHED_PREFIX = 'word.0.2.';    // we cache translated word in localStorage (e.g.: word hello, key = word.hello)

var Setting = {
    setEnable : function (value) {
        localStorage["__MSG_NAME__" + 'enable'] = value;
    },
    getEnable : function(defaultValue) {
        var fromStorage = localStorage["__MSG_NAME__" + 'enable'];
        if(fromStorage) {
            return fromStorage;
        }
        else {
            this.setEnable(defaultValue);
            return defaultValue;
        }
    }
};