
document.FAST_SPEED = 15;
document.NORM_SPEED = 2;


async function tryFF(){
    const currentCaption = await getCurrentCaption(2);
    if(currentCaption === null){
        if(!document.wasFastSpeed){
            setPlaybackSpeed(document.FAST_SPEED);
            console.log("Switched to fast speed.");
            document.wasFastSpeed = true;
        }
    }
    else{
        if(document.wasFastSpeed){
            setPlaybackSpeed(document.NORM_SPEED);
            console.log("Switched to normal speed.");
            document.wasFastSpeed = false;
        }
    }
}
function registerOnSubtitlesChanged(callback) {
    const k = document.getElementById("kaltura_player_ifp");
    const subtitlesElement = k.contentDocument.getElementsByClassName("track")[0];
  
    if (!subtitlesElement) {
      console.error("subtitles element not found");
      setTimeout(()=>registerOnSubtitlesChanged(callback), 500);
      return;
    }
  
    const observer = new MutationObserver(() => {
      callback(subtitlesElement.innerHTML);
    });
  
    const config = { childList: true, subtree: true };
    console.log(subtitlesElement);
    observer.observe(subtitlesElement, config);
  }
  
  // Example usage:
  registerOnSubtitlesChanged((newText) => {
    console.log("Text changed:", newText);
    // Your custom logic here
  });
  

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
            intervalId = setInterval(tryFF, 1);
        } else {
            clearInterval(intervalId);
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
