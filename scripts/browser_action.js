
document.FAST_SPEED = 15;
document.NORM_SPEED = 2;
document.MIN_SKIP_TIME_UNTIL_NEXT_CAPTION = 1; // minimum length of silence until it is skipped
document.START_SKIP_PADDING_TIME = 0.1; // padding to give until the skipping begins
document.END_SKIP_PADDING_TIME = 0.1; // padding to give until the skipping ends

async function tryFF(){
    if(document.isFastSpeed){
        return;
    }
    if(!document.lastCaptionIndex){
        document.lastCaptionIndex = 0;
        return;
    }
    
    if(document.ff_downtime_captions.length <= document.lastCaptionIndex){
        // if past the last caption. Implies silence at the end
        // set your own separate corner case interval
        const timeUntilNextCaption = getVideoElement().duration - getVideoElement().currentTime;
        const timeSinceLastSubtitle = getVideoElement().currentTime-document.ff_downtime_captions[document.ff_downtime_captions.length - 1].endTime;
        if(
            timeUntilNextCaption > document.MIN_SKIP_TIME_UNTIL_NEXT_CAPTION && 
            timeSinceLastSubtitle > document.START_SKIP_PADDING_TIME
        ){
            skipUntilTime(getVideoElement().duration);
        }
        return;
    }
    
    if(document.ff_downtime_captions[document.lastCaptionIndex].endTime < getVideoElement().currentTime){
        // need to redefine the index
        document.lastCaptionIndex++;
        return;
    }

    const timeUntilNextCaption = document.ff_downtime_captions[document.lastCaptionIndex].startTime - getVideoElement().currentTime;
    const timeSinceLastSubtitle = document.lastCaptionIndex > 0 ? getVideoElement().currentTime-document.ff_downtime_captions[document.lastCaptionIndex-1].endTime:999;

    if(
        timeUntilNextCaption > document.MIN_SKIP_TIME_UNTIL_NEXT_CAPTION && 
        timeSinceLastSubtitle > document.START_SKIP_PADDING_TIME
        ){
        // ff to next time
        const timeToSkipTo = document.ff_downtime_captions[document.lastCaptionIndex].startTime - document.END_SKIP_PADDING_TIME;
        
        skipUntilTime(timeToSkipTo);
    }
}

function skipUntilTime(timeToSkipTo){
    if(document.skipSilenceMode){
        // skip to time
        getVideoElement().currentTime = timeToSkipTo;
    }
    else{
        setFastSpeed();
        document.videoFastForwardTimeout = setTimeout(setNormSpeed, ((timeToSkipTo - getVideoElement().currentTime) * 1000)/document.FAST_SPEED);
    }
}

function addRedRectangle(div, percentStart, percentEnd) {
    const redRectangle = document.createElement('div');
    redRectangle.style.position = 'absolute';
    redRectangle.style.top = '0';
    redRectangle.style.left = `${percentStart*100}%`;
    redRectangle.style.height = '100%';
    redRectangle.style.backgroundColor = 'rgba(100, 0, 0, 30)';
    redRectangle.style.zIndex = '99'; // right under bubble
    redRectangle.style.width = `${(percentEnd-percentStart)*100}%`;
    
    // Append the red rectangle to the container div
    div.appendChild(redRectangle);
    return redRectangle;//return for future ref
  }

function generateSkipPeriodsVisualization(){
    const controlBarElement = getVideoSeekBarElement();
    const captions = getVideoCaptions();
    const totalVideoTime = getVideoElement().duration;
    let prevEndTime = 0;
    for(let i = 0; i < captions.length; i++){
        const diffToNextCaption = captions[i].startTime - prevEndTime;
        if(diffToNextCaption > document.MIN_SKIP_TIME_UNTIL_NEXT_CAPTION){
            // if will be skipped
            addRedRectangle(controlBarElement, prevEndTime/totalVideoTime, captions[i].startTime/totalVideoTime);
        }
        prevEndTime = captions[i].endTime;
    }
    // handle last caption to end
    addRedRectangle(controlBarElement, prevEndTime/totalVideoTime, 1);
}

function setFastSpeed(){
    if(!document.isFastSpeed){
        // console.log("Switched to fast speed.");
        document.NORM_SPEED = getPlaybackSpeed();
        setPlaybackSpeed(document.FAST_SPEED);
        document.isFastSpeed = true;
        document.fastforwardImage.hidden = false;
    }
}

function setNormSpeed(){
    if(document.isFastSpeed){
        // console.log("Switched to normal speed.");
        setPlaybackSpeed(document.NORM_SPEED);
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
    skipCheckbox.id = 'skipSilenceCheckbox';

    const skipLabel = document.createElement('label');
    skipLabel.htmlFor = 'skipSilenceCheckbox';
    skipLabel.textContent = 'Skip Silence  ';

    const extensionNameLabel = document.createElement('label');
    extensionNameLabel.textContent = '| UCSD SFF Controls:  ';
    extensionNameLabel.style.fontWeight = 'bold';

    const donateButton = document.createElement('button');
    donateButton.innerHTML = '❤️ Donate';
    donateButton.style.backgroundColor = '#ff69b4';  // Set background color
    donateButton.style.color = '#ffffff';  // Set text color
    donateButton.style.border = 'none';  // Remove border
    donateButton.style.padding = '2px 4px';  // Add padding
    donateButton.style.borderRadius = '5px';  // Add rounded corners
    donateButton.style.cursor = 'pointer';  // Change cursor on hover
    donateButton.addEventListener('click', function() {
        window.open('https://www.buymeacoffee.com/17victork');
    });

    actionLinksUl.appendChild(extensionNameLabel);
    
    actionLinksUl.appendChild(ffCheckbox);
    actionLinksUl.appendChild(label);
    
    actionLinksUl.appendChild(skipCheckbox);
    actionLinksUl.appendChild(skipLabel);
    
    actionLinksUl.appendChild(donateButton);

    function enableSilenceDetection(checked){
        if (checked) {
            document.checkForFastForwardInterval = setInterval(tryFF, 100);
            setNormSpeed();
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

chrome.storage.sync.get(['skipSpeed', 'normalSpeed'], function (result) {
    updateValuesOnPage(result.skipSpeed, result.normalSpeed);
});


function updateValuesOnPage(skipSpeed, normalSpeed) {
    const skipSpeedValue = skipSpeed !== undefined ? skipSpeed : '15';
    const normalSpeedValue = normalSpeed !== undefined ? normalSpeed : '1';

    // Now you can use skipSpeedValue and normalSpeedValue as needed
    document.FAST_SPEED = skipSpeedValue;
    document.NORM_SPEED = normalSpeedValue;
}
didAddSeekedEvent = false;
getCaptionsInterval = setInterval(()=>{
    if(!!getVideoElement() && !!getVideoCaptions() && didAddSeekedEvent && !isNaN(getVideoElement().duration)){
        generateSkipPeriodsVisualization();
        clearInterval(getCaptionsInterval);
    }

    if(!!getVideoElement() && !didAddSeekedEvent){
        didAddSeekedEvent = true;
        injectCheckboxAndInterval();
        getVideoElement().addEventListener("seeked", ()=>{
            document.lastCaptionIndex = getCurrentCaptionIndex(getVideoCaptions(), getVideoElement().currentTime);
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
    if(!getVideoCaptions()){
        pullVideoCaptions();
    }
}, 100);