chrome.browserAction.onClicked.addListener(function(tab) {
    onClicked();
});

async function onClicked(){
    await chrome.tabs.executeScript({
        file: "scripts/browser_action.js"
    });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log(message);
    if (message.action === 'updateValues') {
        updateValuesOnPage(message.skipSpeedValue, message.normalSpeedValue);
    }
});