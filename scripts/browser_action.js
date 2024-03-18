
document.FAST_SPEED = 15;
document.NORM_SPEED = 2;
document.SECONDS_SAVED = 0;

document.SILENT_SECTIONS = [];

document.defaultSettingValues = {
    MIN_SKIP_TIME_UNTIL_NEXT_CAPTION: 2, // minimum length of silence until it is skipped
    START_SKIP_PADDING_TIME: 0.2, // padding to give until the skipping begins
    END_SKIP_PADDING_TIME: 0.2, // padding to give until the skipping ends
    AGGRESSIVENESS: 0.5
}

function getLocalStorageItem(itemID){
    if(!localStorage.getItem(itemID)){
        localStorage.setItem(itemID, document.defaultSettingValues[itemID]);
    }
    return localStorage.getItem(itemID);
}

function setAggressiveness(val){
    localStorage.setItem("AGGRESSIVENESS", val);
    const valuesToModify = ["MIN_SKIP_TIME_UNTIL_NEXT_CAPTION", "START_SKIP_PADDING_TIME", "END_SKIP_PADDING_TIME"];
    valuesToModify.forEach(k=>localStorage.setItem(k, document.defaultSettingValues[k]*val));
}

async function tryFF(){
    if(document.isFastSpeed){
        return;
    }

    if(!document.lastCaptionIndex && document.lastCaptionIndex !== 0){
        document.lastCaptionIndex = 0;
        return;
    }
    const currentTime = getVideoElement().currentTime;
    const videoDuration = getVideoElement().duration;
    const currentIndexCaption = document.ff_downtime_captions[document.lastCaptionIndex];
    const lastCaption = document.ff_downtime_captions[document.lastCaptionIndex-1];
    
    if(document.ff_downtime_captions.length <= document.lastCaptionIndex){
        // if past the last caption. Implies silence at the end
        const timeUntilNextCaption = videoDuration - currentTime;
        const timeSinceLastSubtitle = currentTime-document.ff_downtime_captions[document.ff_downtime_captions.length - 1].endTime;
        if(
            timeUntilNextCaption > getLocalStorageIte("MIN_SKIP_TIME_UNTIL_NEXT_CAPTION") && 
            timeSinceLastSubtitle > getLocalStorageIte("START_SKIP_PADDING_TIME")
        ){
            skipUntilTime(videoDuration);
        }
        return;
    }

    if(document.lastCaptionIndex == 0 && currentTime < currentIndexCaption.startTime){
        // did not get to the first caption yet. Implies silence at the beginning
        const timeUntilNextCaption = currentIndexCaption.startTime-currentTime;
        const timeSinceLastSubtitle = currentTime;
        if(
            timeUntilNextCaption > getLocalStorageIte("MIN_SKIP_TIME_UNTIL_NEXT_CAPTION") && 
            timeSinceLastSubtitle > getLocalStorageIte("START_SKIP_PADDING_TIME")
        ){
            skipUntilTime(currentIndexCaption.startTime);
        }
        return;
    }
    
    if(currentIndexCaption.endTime < currentTime){
        // need to redefine the index
        document.lastCaptionIndex++;
        return;
    }

    const timeUntilNextCaption = currentIndexCaption.startTime - currentTime;
    const timeSinceLastSubtitle = document.lastCaptionIndex > 0 ? currentTime-lastCaption.endTime:999;

    if(
        timeUntilNextCaption > getLocalStorageIte("MIN_SKIP_TIME_UNTIL_NEXT_CAPTION") && 
        timeSinceLastSubtitle > getLocalStorageIte("START_SKIP_PADDING_TIME")
        ){
        // ff to next time
        const timeToSkipTo = currentIndexCaption.startTime;
        
        skipUntilTime(timeToSkipTo);
    }
}

function skipUntilTime(timeToSkipTo){
    if(document.skipSilenceMode){
        // skip to time
        document.SECONDS_SAVED += (timeToSkipTo - getLocalStorageIte("END_SKIP_PADDING_TIME")) - getVideoElement().currentTime;
        document.secondsSavedCounterLabel.textContent = Math.floor(document.SECONDS_SAVED/1000);
        getVideoElement().currentTime = timeToSkipTo - getLocalStorageIte("END_SKIP_PADDING_TIME");
    }
    else{
        setFastSpeed();
        document.videoFastForwardTimeout = setTimeout(setNormSpeed, ((timeToSkipTo - getLocalStorageIte("END_SKIP_PADDING_TIME") - getVideoElement().currentTime) * 1000)/document.FAST_SPEED);
    }
}

function removeAllRectangles(){
    document.SILENT_SECTIONS.forEach(div => {
        div.remove()
    });
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
    document.SILENT_SECTIONS.push(div);
    return redRectangle;//return for future ref
  }

function generateSkipPeriodsVisualization(){
    removeAllRectangles(); // clear all previous rectangles
    const controlBarElement = getVideoSeekBarElement();
    const captions = getVideoCaptions();
    const totalVideoTime = getVideoElement().duration;
    let prevEndTime = 0;
    for(let i = 0; i < captions.length; i++){
        const diffToNextCaption = captions[i].startTime - prevEndTime;
        if(diffToNextCaption > getLocalStorageIte("MIN_SKIP_TIME_UNTIL_NEXT_CAPTION")){
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

        // save when the fast speed was started
        fastSpeedStartedTime = new Date().getTime();

        document.NORM_SPEED = getPlaybackSpeed();
        setPlaybackSpeed(document.FAST_SPEED);
        document.isFastSpeed = true;
        document.fastforwardImage.hidden = false;
    }
}

function setNormSpeed(){
    if(document.isFastSpeed){
        // console.log("Switched to normal speed.");

        // save when the fast speed was started
        document.SECONDS_SAVED += (new Date().getTime() - fastSpeedStartedTime) * document.FAST_SPEED;
        document.secondsSavedCounterLabel.textContent = Math.floor(document.SECONDS_SAVED/1000);
        fastSpeedStartedTime = null;

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
    label.style.fontWeight = 'bold';

    actionLinksUl.appendChild(ffCheckbox);
    actionLinksUl.appendChild(label);


    const skipCheckbox = document.createElement('input');
    skipCheckbox.type = 'checkbox';
    skipCheckbox.id = 'skipSilenceCheckbox';

    const skipLabel = document.createElement('label');
    skipLabel.htmlFor = 'skipSilenceCheckbox';
    skipLabel.textContent = 'Skip Silence  ';
    skipLabel.style.fontWeight = 'bold';

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
    donateButton.style.marginLeft = '5px';
    donateButton.addEventListener('click', function() {
        window.open('https://www.buymeacoffee.com/17victork');
    });

    const secondsSavedLabel = document.createElement('label');
    secondsSavedLabel.textContent = ` | Seconds saved: `;
    secondsSavedLabel.style.fontWeight = 'bold';

    document.secondsSavedCounterLabel = document.createElement('label');
    document.secondsSavedCounterLabel.textContent = `0`;
    document.secondsSavedCounterLabel.style.fontWeight = 'bold';

    actionLinksUl.appendChild(extensionNameLabel);
    
    actionLinksUl.appendChild(ffCheckbox);
    actionLinksUl.appendChild(label);
    
    actionLinksUl.appendChild(skipCheckbox);
    actionLinksUl.appendChild(skipLabel);
    
    actionLinksUl.appendChild(secondsSavedLabel);
    actionLinksUl.appendChild(document.secondsSavedCounterLabel);

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
        showRatingWindow();
    }

    function handleSkipModeCheckboxChange(){
        document.skipSilenceMode = true;
        ffCheckbox.checked = false;
        setNormSpeed();
        enableSilenceDetection(skipCheckbox.checked);
        showRatingWindow();
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