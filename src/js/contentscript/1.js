(function () {
    var DEBUG;

    var delayBetweenRefresh = 50;
    var delayBetweenAction = 2000;

    var thresholdLevel = 0x30;  // edge sensitive
    var aboveAverageLevelOfZone = 30;   // how many average points in zone consider that it's matching

    var timeOut;
    var lastImageData;  // last image from webcam

    var video;
    var canvasSource;
    var canvasBlended;
    var contextSource;
    var contextBlended;

    var soundContext;
    var bufferLoader;

    var numberOfActions = 3;
    var kineticBarHeight;   // only take this height of image from top to render
    var inlineDivIdToProcess = '_Jinect_Container';
    /**
    Contain sound with buffer of mp3
    */
    var Storage_Sounds = [];
    var Storage_ActionDatas = [];
    var Storage_ActionHandler =
    {
        'REFRESH': function () {
            sendMessageToBackground('REFRESH', null);
        },
        'BACK': function () {
            sendMessageToBackground('BACK', null);
        },
        'FORWARD': function () {
            sendMessageToBackground('FORWARD', null);
        },
        'SCROLLDOWN': function () {
            window.scrollBy(0, 600);
            try {
                var actualCode = ['/* Code here. Example: */nextSlide();',
                  ' // Beware! This array have to be joined',
                  ' // using a newline. Otherwise, missing semicolons',
                  ' //  or single-line comments (//) will mess up your',
                  ' //  code ----->'].join('\n');

                var script = document.createElement('script');
                script.textContent = actualCode;
                (document.head || document.documentElement).appendChild(script);
                script.parentNode.removeChild(script);
            }
            catch (e) {
                console.log(e);
            }
        },
        'SCROLLUP': function () {
            window.scrollTo(0, 0);
            try {
                var actualCode = ['/* Code here. Example: */prevSlide();',
                  ' // Beware! This array have to be joined',
                  ' // using a newline. Otherwise, missing semicolons',
                  ' //  or single-line comments (//) will mess up your',
                  ' //  code ----->'].join('\n');

                var script = document.createElement('script');
                script.textContent = actualCode;
                (document.head || document.documentElement).appendChild(script);
                script.parentNode.removeChild(script);
            }
            catch (e) {
                console.log(e);
            }
        },
        'FULLSCREEN': function () {
            document.documentElement.webkitRequestFullScreen();
        },
        'EXITFULLSCREEN': function () {
        }


    };

    var LastMouseTimestamp;
    var MouseIdleHandler = null;
    var isInitializeAudioVideo = false; // already run InitializeAudioVideo() or not


    /******************************************************/
    /******************************************************/
    /******************************************************/

    function TurnOnKinectMode() {
        console.log("TurnOnKinectMode");

        var deferGetContentInjectionFromTemplate = new $.Deferred();
        var template = {
            id: 'contentInjectionhtml',
            url: 'contentInjection.html'
        };

        if ($('#' + template.id).length) {
            // DOM node existed, dont add more
            console.log('existed, dont add more');
            return;
        }
        else {
            // try to get from cache
            var contentInjection = localStorage.getValue(CACHED_PREFIX + 'contentInjection');
            if (DEBUG) {
                contentInjection = null;
            }

            var deferGetTemplate = new $.Deferred();
            if (!contentInjection) {
                // get it from template, cache it

                // Asynchronously load the template definition file.
                $.get(chrome.extension.getURL(template.url), function (element) {
                    console.log('Load template success', template.id, template.url);
                    contentInjection = element;
                    localStorage.setValue(CACHED_PREFIX + 'contentInjection', contentInjection);
                    console.log('cached contentInjection');
                    deferGetTemplate.resolve(contentInjection);
                }
                , 'html'    // NOTE: in packaged app, if you want to get a html file inside packaged app, must specify the dataType param (=html)
                );
            }
            else {
                console.log('use cached contentInjection', contentInjection);
                deferGetTemplate.resolve(contentInjection);
            }

            $.when(deferGetTemplate).then(function (content) {
                AddInlineHTMLtoPageView(content, NOTIFICATION_TIMEOUT);
                initializeAudioVideo();
            });
        }   // end else not existed in DOM

    }   // end function


    function AddInlineHTMLtoPageView(html, autoHideTimeout) {
        /*
        try to get/create divContainer. Then insert param html as innerHTML of that div
        @param: 
        html: html to inject as innerHTML of the div
        */

        var divPopupContainer = document.getElementById(inlineDivIdToProcess);
        if (divPopupContainer) {
            // do nothing if already existed in ContentDocument
        }
        else {
            // create the container
            divPopupContainer = document.createElement('div');
            divPopupContainer.id = inlineDivIdToProcess;
            var _body = document.getElementsByTagName('body')[0];

            // add to pageview document body
            _body.insertBefore(divPopupContainer, _body.childNodes[0]);


            divPopupContainer.addEventListener("dblclick", function (event) {
                /*
                double click on inline popup to hide
                */

                TurnOffKinectMode();
                return false;
            });
        }

        if (autoHideTimeout) {
            // setTimeout(function () { TurnOffKinectMode(); }, autoHideTimeout);
        }

        divPopupContainer.innerHTML = html;
        $(divPopupContainer).show();

        if (DEBUG) {
            $('#_Jinect_Container').toggleClass('DEBUG', true);
        }
    }

    function TurnOffKinectMode() {
        isInitializeAudioVideo = false;
        $('#' + inlineDivIdToProcess).hide();
    }


    function sendMessageToBackground(method, data) {
        /*
        normalize the wordToLookup
        send request to extension to query webservice to get result
        */

        chrome.extension.sendMessage({ method: method, data: data }, function (response) {
            console.log('contentscript take response from background: ', response);
        });
    }


    /**
    init main program
    */
    function initializeAudioVideo() {
        // don't do twice
        if (isInitializeAudioVideo) {
            return;
        }
        else {
            isInitializeAudioVideo = true;
        }

        video = $('#webcam')[0];
        canvasSource = $("#canvasSource")[0];
        canvasBlended = $("#canvasBlended")[0];
        contextSource = canvasSource.getContext('2d');
        contextBlended = canvasBlended.getContext('2d');

        // kineticBarHeight = DEBUG ? canvasBlended.offsetHeight : $('#KinectBar').children(":first").height();
        kineticBarHeight = canvasBlended.offsetHeight;
        w('kineticBarHeight ', kineticBarHeight);


        // INIT AUDIO
        if (hasAudio()) {
            w('sound is enable');
            loadSounds();
        } else {
            w('sound is disable');
        }


        // INIT VIDEO
        if (navigator.webkitGetUserMedia) {
            // navigator.webkitGetUserMedia('audio, video', function (stream) {
            navigator.webkitGetUserMedia({ video: true }, function (stream) {
                w('webcam detect ok');
                video.src = window.webkitURL.createObjectURL(stream);

                mirrorVideo(contextSource);
                initStorage();

                // delay the start motion detection
                setTimeout(startMotionDetect, 3000);
            }, function (e) {
                w('Webcam error!', e);
            });
        } else {
            return;
        }
    }   // end initializeAudioVideo





    function loadSounds() {
        /// <summary>Load sound to </summary>
        soundContext = new AudioContext();
        bufferLoader = new BufferLoader(soundContext,
			[
                 chrome.extension.getURL('sounds/note0.mp3'),
				 chrome.extension.getURL('sounds/note1.mp3'),
				 chrome.extension.getURL('sounds/note2.mp3')
			],
			finishedLoading
		);
        bufferLoader.load();
    }
    function finishedLoading(bufferList) {
        for (var i = 0; i < numberOfActions; i++) {
            var source = soundContext.createBufferSource();
            source.buffer = bufferList[i];
            source.connect(soundContext.destination);
            Storage_Sounds.push(source);
        }
    }

    function initStorage() {
        for (var i = 0; i < numberOfActions; i++) {
            var $e = $("#actionUI" + i);
            var actionButtonElement = $e[0];
            var actionData = {
                name: $e[0].dataset.job,
                sound: Storage_Sounds[i],
                ready: true,
                area: {
                    x: actionButtonElement.offsetLeft,
                    y: actionButtonElement.offsetTop,
                    width: actionButtonElement.offsetWidth,
                    height: actionButtonElement.offsetHeight
                },
                callback: function (r) {
                    // w(r);
                },
                visual: $e
            };

            Storage_ActionDatas.push(actionData);
        }
    }





    function startMotionDetect() {
        w('start Motion Detect');

        //        if (!DEBUG) {
        //            $(canvasSource).hide(); // speed, but might cause error
        //        }

        $(canvasBlended).show();
        updateContinuous();
    }

    function mirrorVideo(canvasContext2D) {
        /// <summary>mirror video so left of us is left of canvas</summary>

        w('mirror video');
        canvasContext2D.translate(canvasSource.width, 0);
        canvasContext2D.scale(-1, 1);
        // var c = 5;
    }

    function updateContinuous() {
        /// <summary>draw video from video to contextSource
        /// blend it to detect edge
        /// check Areas for motion
        /// </summary>

        // draw from video to canvas
        contextSource.drawImage(video, 0, 0, video.width, video.height); // 2dContext.drawImage from video stream

        blend();
        checkAreas();
        timeOut = setTimeout(updateContinuous, delayBetweenRefresh);
    }





    function blend() {
        /// <summary>put the difference of sourceData and lastImageData to blended canvas</summary>

        var width = canvasSource.width;
        // var height = canvasSource.height;
        var height = kineticBarHeight;    // reduce image size to blend

        // get webcam image data
        var sourceData = contextSource.getImageData(0, 0, width, height);

        // create an image if the previous image doesn’t exist
        if (!lastImageData) {
            lastImageData = contextSource.getImageData(0, 0, width, height);
        }

        // create a ImageData instance to receive the blended OUT result
        var blendedImageData = contextSource.createImageData(width, height);

        // blend the 2 images (just take from webcam) and (lastImageData) into (blendedImageData)
        differenceAccuracy(blendedImageData.data, sourceData.data, lastImageData.data);

        // draw the result in a canvas
        contextBlended.putImageData(blendedImageData, 0, 0);

        // store the current webcam image
        lastImageData = sourceData;
    }

    function fastAbs(value) {
        // funky bitwise, equal Math.abs
        return (value ^ (value >> 31)) - (value >> 31);
    }

    function threshold(value) {
        return (value > thresholdLevel) ? 0xFF : 0;
    }

    function difference(target, data1, data2) {
        // blend mode difference
        if (data1.length != data2.length) return null;
        var i = 0;
        while (i < (data1.length * 0.25)) {
            target[4 * i] = data1[4 * i] == 0 ? 0 : fastAbs(data1[4 * i] - data2[4 * i]);
            target[4 * i + 1] = data1[4 * i + 1] == 0 ? 0 : fastAbs(data1[4 * i + 1] - data2[4 * i + 1]);
            target[4 * i + 2] = data1[4 * i + 2] == 0 ? 0 : fastAbs(data1[4 * i + 2] - data2[4 * i + 2]);
            target[4 * i + 3] = 0xFF;
            ++i;
        }
    }

    function differenceAccuracy(target, data1, data2) {
        if (data1.length != data2.length) return null;
        var i = 0;
        while (i < (data1.length * 0.25)) {
            var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
            var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
            var diff = threshold(fastAbs(average1 - average2));
            target[4 * i] = diff;
            target[4 * i + 1] = diff;
            target[4 * i + 2] = diff;
            target[4 * i + 3] = 0xFF;
            ++i;
        }
    }

    function checkAreas() {

        // loop over the action UI areas
        for (var r = 0; r < numberOfActions; ++r) {
            // get the pixels in a note area from the blended image
            var actionData = Storage_ActionDatas[r];
            // get blendImageData from blend canvas
            var blendedImageData = contextBlended.getImageData(actionData.area.x, actionData.area.y, actionData.area.width, actionData.area.height);

            var i = 0;
            var average = 0;
            // loop over the pixels
            while (i < (blendedImageData.data.length * 0.25)) {
                // make an average between the color channel
                average += (blendedImageData.data[i * 4] + blendedImageData.data[i * 4 + 1] + blendedImageData.data[i * 4 + 2]) / 3;
                ++i;
            }
            // calculate an average between of the color values of the note area
            average = Math.round(average / (blendedImageData.data.length * 0.25));
            if (average > aboveAverageLevelOfZone) {
                // over a small limit, consider that a movement is detected

                // DO JOB
                actionData.callback(r);
                doJob(actionData);
            }
        }
    }


    function doJob(actionData) {
        /// <summary>doJob with actionData</summary>

        // throttle the action
        if (!actionData.ready) return;
        actionData.ready = false;

        try {
            var actionName = actionData.name.toUpperCase();
            w(actionName);
            var actionHandler = Storage_ActionHandler[actionName];
            if (actionHandler) {
                actionHandler(actionName);
            }
        }
        catch (e) {
            w(e);
        }

        // interface feedback for user
        playSound(actionData);
        actionData.visual.css({ 'opacity': 1 });
        actionData.visual.animate({ 'opacity': 0.3 });

        // throttle the action
        setTimeout(setActionReady, delayBetweenAction, actionData);
    }
    function setActionReady(actionData) {
        actionData.ready = true;
        actionData.visual.css({ 'opacity': 1 });
    }

    function playSound(actionData) {
        /// <summary>Play sound base on cached buffer</summary>
        try {
            var source = soundContext.createBufferSource();
            source.buffer = actionData.sound.buffer;
            source.connect(soundContext.destination);
            source.noteOn(0);
        }
        catch (e) { }
    }



    /////////////////////////////////////
    // event handlers
    /////////////////////////////////////
    //    document.addEventListener("mouseup", function (event) {
    //        /*
    //        */

    //        LastMouseTimestamp = Date.now();
    //        clearTimeout(MouseIdleHandler);
    //        // MouseIdleHandler = setTimeout(TurnOnKinectMode, 10000); // restart new waiting for MouseIdle

    //        console.log("mouseup", LastMouseTimestamp, MouseIdleHandler);
    //    });



    document.addEventListener("keypress", function (event) {
        /*
        select text, press ` key to lookup
        */

        if (event.keyCode == 96) {  // the ` key

            // ignore input and text area
            if (checkEditable(event.target)) {
            }
            else {
                TurnOnKinectMode();
                return false;
            }
        }
    });

    /// On the receiving end, you need to set up an chrome.extension.onRequest event listener to handle the message. 
    /// This looks the same from a content script or extension page. 
    /// The request will remain open until you call sendResponse, 
    /// so it is good practice to call sendResponse with an empty object to allow the request to be cleaned up.
    chrome.extension.onMessage.addListener(
      function (request, sender, sendResponse) {
          console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
          if (request.wordToLookup) {
              getTranslation(request.wordToLookup);
          }

          sendResponse({}); // snub them.
      });



    /////////////////////////////////////
    // Main routine
    /////////////////////////////////////
    $(document).ready(function () {
        if (document.location.hash.toUpperCase().indexOf("DEBUG") >= 0) {
            DEBUG = true;
        }
        else {
            DEBUG = false;
        }

        DEBUG = true;

        setTimeout(TurnOnKinectMode, 2000);
    });

})();