
document.FAST_SPEED = 15;
document.NORM_SPEED = 2;


async function tryFF(){
    if(document.isFastSpeed){
        return;
    }
    if(!document.lastCaptionIndex){
        document.lastCaptionIndex = 0;
    }
    
    if(document.ff_downtime_captions[document.lastCaptionIndex].endTime < getVideoElement().currentTime){
        // need to redefine the index
        document.lastCaptionIndex++;
    }

    // console.log(document.ff_downtime_captions[document.lastCaptionIndex], getVideoElement().currentTime);
    const timeUntilNextCaption = document.ff_downtime_captions[document.lastCaptionIndex].startTime - getVideoElement().currentTime;
    const timeSinceLastSubtitle = document.lastCaptionIndex > 0 ? getVideoElement().currentTime-document.ff_downtime_captions[document.lastCaptionIndex-1].endTime:999;
    // console.log(`Diff to next caption: ${timeUntilNextCaption}. Time since last: ${timeSinceLastSubtitle}`);

    if(timeUntilNextCaption > 2 && timeSinceLastSubtitle > 0.2){
        // ff to next time
        const timeToSkipTo = document.ff_downtime_captions[document.lastCaptionIndex].startTime - 0.2;
        // skip to time
        // getVideoElement().currentTime = timeToSkipTo;

        setFastSpeed();
        document.videoFastForwardTimeout = setTimeout(setNormSpeed, ((timeToSkipTo - getVideoElement().currentTime) * 1000)/document.FAST_SPEED);
        // console.log(timeToSkipTo - getVideoElement().currentTime);
    }

    // const currentCaption = await getCurrentCaption(2);
    // if(currentCaption === null){
    //     setFastSpeed();
    //     clearInterval(document.checkForFastForwardInterval);
    //     // set interval to wait for subtitles
    //     document.waitingForSubtitlesInterval = setInterval(()=>{
    //         const k = document.getElementById("kaltura_player_ifp");
    //         const subtitlesElement = k.contentDocument.getElementsByClassName("track")[0];
    //         if(subtitlesElement != null){
    //             clearInterval = document.waitingForSubtitlesInterval
    //             setNormSpeed();
    //             if (document.getElementById("skipSilenceCheckbox").checked) {
    //                 document.checkForFastForwardInterval = setInterval(tryFF, 100);
    //             } 
    //         }
    //     }, 1);
    // }
}

function setFastSpeed(){
    if(!document.isFastSpeed){
        setPlaybackSpeed(document.FAST_SPEED);
        console.log("Switched to fast speed.");
        document.isFastSpeed = true;
        document.fastforwardImage.hidden = false;
    }
}

function setNormSpeed(){
    if(document.isFastSpeed){
        setPlaybackSpeed(document.NORM_SPEED);
        console.log("Switched to normal speed.");
        document.isFastSpeed = false;
        document.fastforwardImage.hidden = true;
    }
}

function injectCheckboxAndInterval() {
    const actionLinksUl = document.getElementById('actionLinks');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'skipSilenceCheckbox';

    const label = document.createElement('label');
    label.htmlFor = 'skipSilenceCheckbox';
    label.textContent = 'Skip Silence';

    actionLinksUl.appendChild(checkbox);
    actionLinksUl.appendChild(label);
    

    function handleCheckboxChange() {
        if (checkbox.checked) {
            document.checkForFastForwardInterval = setInterval(tryFF, 500);
        } else {
            clearInterval(document.checkForFastForwardInterval);
        }
    }

    checkbox.addEventListener('change', handleCheckboxChange);
}

injectCheckboxAndInterval();


chrome.storage.sync.get(['skipSpeed', 'normalSpeed'], function (result) {
    updateValuesOnPage(result.skipSpeed, result.normalSpeed);
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'updateValues') {
        updateValuesOnPage(message.skipSpeedValue, message.normalSpeedValue);
    }
});

function updateValuesOnPage(skipSpeed, normalSpeed) {
    const skipSpeedValue = skipSpeed !== undefined ? skipSpeed : '15';
    const normalSpeedValue = normalSpeed !== undefined ? normalSpeed : '1';

    // Now you can use skipSpeedValue and normalSpeedValue as needed
    console.log('Skip Speed:', skipSpeedValue);
    console.log('Normal Speed:', normalSpeedValue);
    document.FAST_SPEED = skipSpeedValue;
    document.NORM_SPEED = normalSpeedValue;
}
didAddSeekedEvent = false;
getCaptionsInterval = setInterval(()=>{
    if(getVideoCaptions()){
        clearInterval(getCaptionsInterval);
    }
    pullVideoCaptions();

    if(getVideoElement() && !didAddSeekedEvent){
        didAddSeekedEvent = true;
        getVideoElement().addEventListener("seeked", ()=>{
            document.lastCaptionIndex = getCurrentCaptionIndex(getVideoCaptions(), getVideoElement().currentTime);
            console.log("caption update");
            clearTimeout(document.videoFastForwardTimeout);
            setNormSpeed();


            document.fastforwardImage = document.createElement('img');
            document.fastforwardImage.src = 'https://i.imgur.com/cjNYz43.png';
            document.fastforwardImage.style.position = 'absolute';
            document.fastforwardImage.style.bottom = '5px';
            document.fastforwardImage.style.right = '5px';
            document.fastforwardImage.style.zIndex = '9999'; 
            document.fastforwardImage.style.width = '5%';
            document.fastforwardImage.style.height = 'auto';
            document.fastforwardImage.hidden = true;
            getVideoElement().parentNode.appendChild(document.fastforwardImage);
        }
        );
    }
}, 100);

