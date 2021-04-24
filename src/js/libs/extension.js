/* COMMON function of Chrome extension 
and
this extension
*/


/******************************************************/
/********TRANSLATE AND RESOURCE ***********************/
/******************************************************/
function _T(elementId, resourceKey) {
    /*
    put translated resourceKey's text (i18n text) to elementId.innerText
    if can't find res text, set resourceKey innerText
    */

    var element = document.getElementById(elementId);
    if(element){
        var stringFromRes = chrome.i18n.getMessage(resourceKey);
        element.innerText = stringFromRes ? stringFromRes : resourceKey;
    }
}
function _InitI18nForPage(arrayMapping) {
    /*
    loop through array of {elementId, resourceKey}, translate elementId with resourceKey
    */
    for (var i in arrayMapping) {
        var obj = arrayMapping[i];
        _T(obj.elementId, obj.resourceKey);
    }   
}


/**
Write log
*/
function w() {
    var str = '';
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
            str += arguments[i].toString();
        }
    }

    console.log(str);
    $('#message').text(str).show();
}


function showDesktopNotification(title, textToDisplay) {
    /*
    show desktop notification of first meaning content
    */

    var optionEnableNotificationTranslate = true;

    if(!optionEnableNotificationTranslate)
    {
        return;
    }

    // Create a simple text notification:
    var notification = webkitNotifications.createNotification(
        'images/icon48.png',  // icon url - can be relative
        title,  // notification title
        textToDisplay // notification body text
    );

    // Or create an HTML notification:
    // var notification = webkitNotifications.createHTMLNotification(
    //   'notification.html?abc=def'  // html url - can be relative. in that html file, we can use js to modify content, base on url
    // );

    // Then show the notification.
    notification.show();
    // auto hide after a while
    setTimeout(function () { notification.cancel(); }, NOTIFICATION_TIMEOUT);
}


function showInlineNotification(textToDisplay) {
    /*
    show in pageview notification of first meaning content
    */

    var optionEnableInlineNotificationTranslate = true;
    if (!optionEnableInlineNotificationTranslate) {
        return;
    }

    return { inlineNotificationHtml: textToDisplay };
}


function showBrowserActionPopup(wordToLookup) {
    /*
    display html content to popup of browser action
    */

    var popupUrl = "popup.html?word=" + encodeURIComponent(wordToLookup);
//    console.log('set popup of browser action', popupUrl);
    chrome.browserAction.setPopup({
        popup: popupUrl 
    });
}
