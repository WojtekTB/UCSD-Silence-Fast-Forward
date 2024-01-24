// Add your JavaScript code here
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded event fired');
    const skipSpeedInput = document.getElementById('skipSpeed');
    const normalSpeedInput = document.getElementById('normalSpeed');
    const saveButton = document.getElementById('saveButton');

    // Load saved values or set default values
    chrome.storage.sync.get(['skipSpeed', 'normalSpeed'], function (result) {
        const skipSpeedValue = result.skipSpeed !== undefined ? result.skipSpeed : '15'; // Default value for skipSpeed is set to 15
        const normalSpeedValue = result.normalSpeed !== undefined ? result.normalSpeed : '1'; // Default value for normalSpeed is set to 1

        // Set input values based on saved or default values
        skipSpeedInput.value = skipSpeedValue;
        normalSpeedInput.value = normalSpeedValue;
    });


    // Save values when the Save button is clicked
    saveButton.addEventListener('click', function () {
        const skipSpeedValue = skipSpeedInput.value;
        const normalSpeedValue = normalSpeedInput.value;

        // Save values to Chrome storage
        chrome.storage.sync.set({ skipSpeed: skipSpeedValue, normalSpeed: normalSpeedValue }, function () {
            console.log('Values saved');
            chrome.runtime.sendMessage({ action: 'updateValues', skipSpeed: skipSpeedValue, normalSpeed: normalSpeedValue });
            // Close the popup
            window.close();
        });
    });

});
