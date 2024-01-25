
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
        const timeToSkipTo = document.ff_downtime_captions[document.lastCaptionIndex].startTime - 0.1;
        
        if(document.skipSilenceMode){
            // skip to time
            getVideoElement().currentTime = timeToSkipTo;
        }
        else{
            setFastSpeed();
            document.videoFastForwardTimeout = setTimeout(setNormSpeed, ((timeToSkipTo - getVideoElement().currentTime) * 1000)/document.FAST_SPEED);
        }
    }
}

function setFastSpeed(){
    if(!document.isFastSpeed){
        document.NORM_SPEED = getPlaybackSpeed();
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
    const ffCheckbox = document.createElement('input');
    ffCheckbox.type = 'checkbox';
    ffCheckbox.id = 'ffSilenceCheckbox';

    const label = document.createElement('label');
    label.htmlFor = 'ffSilenceCheckbox';
    label.textContent = 'Fast-Forward Silence  ';

    actionLinksUl.appendChild(ffCheckbox);
    actionLinksUl.appendChild(label);


    const skipCheckbox = document.createElement('input');
    skipCheckbox.type = 'checkbox';
    skipCheckbox.id = 'ffSilenceCheckbox';

    const skipLabel = document.createElement('label');
    skipLabel.htmlFor = 'skipSilenceCheckbox';
    skipLabel.textContent = 'Skip Silence';

    actionLinksUl.appendChild(ffCheckbox);
    actionLinksUl.appendChild(label);

    actionLinksUl.appendChild(skipCheckbox);
    actionLinksUl.appendChild(skipLabel);
    
    function enableSilenceDetection(checked){
        if (checked) {
            document.checkForFastForwardInterval = setInterval(tryFF, 100);
            setNormSpeed();
            console.log(getVideoElement());
        } else {
            clearInterval(document.checkForFastForwardInterval);
            clearTimeout(document.videoFastForwardTimeout);
        }
    }

    function handleFFCheckboxChange() {
        document.skipSilenceMode = false;
        skipCheckbox.checked = false;
        setNormSpeed();
        enableSilenceDetection(ffCheckbox.checked);
    }

    function handleSkipModeCheckboxChange(){
        document.skipSilenceMode = true;
        ffCheckbox.checked = false;
        setNormSpeed();
        enableSilenceDetection(skipCheckbox.checked);
    }

    ffCheckbox.addEventListener('change', handleFFCheckboxChange);
    skipCheckbox.addEventListener('change', handleSkipModeCheckboxChange);
}

injectCheckboxAndInterval();


chrome.storage.sync.get(['skipSpeed', 'normalSpeed'], function (result) {
    updateValuesOnPage(result.skipSpeed, result.normalSpeed);
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
    if(!!getVideoElement() && !!getVideoCaptions() && didAddSeekedEvent){
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

