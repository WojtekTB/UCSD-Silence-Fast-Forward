chrome.browserAction.onClicked.addListener(function(tab) {
    onClicked();
});

async function onClicked(){
    await chrome.tabs.executeScript({
        file: "scripts/browser_action.js"
    });
}

