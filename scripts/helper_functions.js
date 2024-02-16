function setPlaybackSpeed(speed) {
  let videoElement = getVideoElement();
  videoElement.playbackRate = speed;
}

function getPlaybackSpeed() {
  let videoElement = getVideoElement();
  return videoElement.playbackRate;
}

function fetchTextContent(url) {
    return fetch(url)
        .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        return response.text();
        })
        .catch(error => {
        throw new Error(`Error fetching the URL: ${error.message}`);
        });
}

function secondsToTimeStamp(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const remainingSecondsAfterHours = seconds % 3600;
    const minutes = Math.floor(remainingSecondsAfterHours / 60);
    const remainingSeconds = remainingSecondsAfterHours % 60;
  
    // Use padStart to ensure two digits for each component
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function timeStampToSeconds(timeStamp) {
    const [hours, minutes, seconds] = timeStamp.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

function removeAfterFirstComma(inputString) {
    // Find the index of the first comma
    const commaIndex = inputString.indexOf(',');
  
    // If a comma is found, extract the substring before the comma
    if (commaIndex !== -1) {
      return inputString.substring(0, commaIndex);
    }
  
    // If no comma is found, return the original string
    return inputString;
  }
  
function parseCaptionString(captionString) {
    // Define a regular expression pattern to extract components
    const regex = /^(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]+)$/;
  
    // Use the regular expression to match the input string
    const match = captionString.match(regex);
  
    // Check if there's a match
    if (match) {
      const captionNumber = match[1];
      const startTime = timeStampToSeconds(removeAfterFirstComma(match[2]));
      const endTime = timeStampToSeconds(removeAfterFirstComma(match[3]));
      const captionText = match[4].replace(/\n/g, ' '); // Replace \n with spaces
  
      return {
        captionNumber,
        startTime,
        endTime,
        captionText,
      };
    } else {
      console.error('Invalid caption string format');
      return null;
    }
}
  
function getVideoElement(){
    if(!document.ff_downtime_video_element){
        const videoId = "pid_kaltura_player";
        const k = document.getElementById("kaltura_player_ifp")
        document.ff_downtime_video_element = k.contentDocument.getElementById(videoId);
    }
    return document.ff_downtime_video_element;
    }
    
function getVideoSeekBarElement(){
  if(!document.ff_downtime_video_seek_bar_element){
    const k = document.getElementById("kaltura_player_ifp");
    const sliderContainer = k.contentDocument.getElementsByClassName('controlBarContainer')[0];
    document.ff_downtime_video_seek_bar_element = sliderContainer.querySelectorAll('[role="slider"]')[0];
  }
  return document.ff_downtime_video_seek_bar_element;
}

function getVideoCaptions() {
    return document.ff_downtime_captions;
}

async function pullVideoCaptions(){
  if(!document.ff_downtime_captions){
    const video = getVideoElement();
    
    if (!video) {
        console.error(`Video element with ID '${videoId}' not found.`);
        return [];
    }
    const videoTrack = video.getElementsByTagName("track")[0];
    if (!videoTrack || !videoTrack.src) {
        console.error(`Video element with ID '${videoId}' has no track.`);
        return [];
    }
    
    const videoCaptionURL = videoTrack.src;
    
    const captionText = await fetchTextContent(videoCaptionURL);
    const splitCaptions = captionText.split("\n\n");
    const captionObjs = [];
    splitCaptions.forEach(caption => captionObjs.push(parseCaptionString(caption)));
    document.ff_downtime_captions = captionObjs;
    console.log("defined video captions")
  }
}

function findCaptionByTime(captions, targetTime) {
  let low = 0;
  let high = captions.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentCaption = captions[mid];

    const startTime = currentCaption.startTime;
    const endTime = currentCaption.endTime;

    if (startTime <= targetTime && targetTime <= endTime) {
      // The target time is within the current caption's time range
      return currentCaption;
    } else if (targetTime < startTime) {
      // The target time is before the current caption
      high = mid - 1;
    } else {
      // The target time is after the current caption
      low = mid + 1;
    }
  }

  // If no matching caption is found
  return null;
}

function getCurrentCaptionIndex(captions, targetTime) {
    let low = 0;
    let high = captions.length - 1;
  
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const currentCaption = captions[mid];
  
      const startTime = currentCaption.startTime;
      const endTime = currentCaption.endTime;
  
      if (startTime <= targetTime && targetTime <= endTime) {
        // The target time is within the current caption's time range
        return mid;
      } else if (targetTime < startTime) {
        // The target time is before the current caption
        high = mid - 1;
      } else {
        // The target time is after the current caption
        low = mid + 1;
      }
    }
  
    // If no matching caption is found
    return low;
  }
function getCaptionsInRange(startTime, endTime) {
    const captions = getVideoCaptions();
    let startSeconds = startTime;
    let endSeconds = endTime;
    if(typeof(startTime) === "string"){
        // Convert start and end times to seconds
        startSeconds = startTime;
        endSeconds = endTime;
    }
  
    // Filter captions based on the time range
    const captionsInRange = captions.filter(caption => {
      const captionStartTime = caption.startTime;
      const captionEndTime = caption.endTime;
      return captionStartTime >= startSeconds && captionEndTime <= endSeconds;
    });
  
    // Print the captions in the range
    if (captionsInRange.length > 0) {
      console.log(`Captions from ${startTime} to ${endTime}:`);
      let captionTextInRange = "";
      captionsInRange.forEach(caption => {
        captionTextInRange += `${caption.startTime}-${caption.endTime}:${caption.captionText}\n`;
      });
    //   console.log(captionTextInRange);
      return captionTextInRange;
    } else {
    //   console.log('No captions found in the specified time range.');
      return null;
    }
}

function getCurrentCaption(margin = -1){
    const currentTime = getVideoElement().currentTime;
    if(margin == -1){
        return getCaptionsInRange(Math.max(currentTime-margin, 0), currentTime+margin);
    }
    return findCaptionByTime(getVideoCaptions(), currentTime);
}

function showRatingWindow() {
  if(localStorage.getItem('extensionRatingWindowClosed') === null){
      localStorage.setItem('extensionRatingWindowClosed', (Math.random() * 4)+5);
  }
  if (localStorage.getItem('extensionRatingWindowClosed') > 0) {
      localStorage.setItem('extensionRatingWindowClosed', localStorage.getItem('extensionRatingWindowClosed')-1);
      return; // If so, do not show the rating window again
  }
  if(document.getElementById("ratingWindow")){
    // if already showing it
    return;
  }
  // Create a div element for the rating window
  const ratingWindow = document.createElement('div');
  ratingWindow.style.position = 'fixed';
  ratingWindow.style.top = '40px'; // Adjust the top position as needed
  ratingWindow.style.right = '10px'; // Adjust the right position as needed
  ratingWindow.style.width = '30vw';
  ratingWindow.style.backgroundColor = '#fff';
  ratingWindow.style.padding = '20px';
  ratingWindow.style.border = '1px solid #ccc';
  ratingWindow.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  ratingWindow.style.textAlign = 'center';
  ratingWindow.style.zIndex = 99999;
  ratingWindow.id = 'ratingWindow';
  ratingWindow.innerHTML = `
      <div style="display: inline-block; text-align: center;">
      <p>Hey!</p>
      <p>My name is Victor. I am a college student who made the UCSD Podcast Silence Fast-Forward extension! </p>
      <p>I made it on my own time entirely for free.</p>
      <p>I would really appreciate it if you could rate it on google chrome store, or could share it with your classmates!</p>
      <p>It would help me and my work a lot!</p>
          <div style="display: inline-block; text-align: left;">
              <p>Thank you!</p>
          </div>
      </div>
    <button id="rateButton" style="padding: 10px 20px; background-color: #4CAF50; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Rate Now</button>
    <button id="dismissButton" style="margin-left: 10px; padding: 10px 20px; background-color: #ccc; color: #333; border: none; border-radius: 5px; cursor: pointer;">Dismiss</button>
  `;

  // Append the rating window to the body
  document.body.appendChild(ratingWindow);

  // Add event listeners to the rate and dismiss buttons
  document.getElementById('rateButton').addEventListener('click', function() {
    // Open the Chrome Web Store page for your extension where users can leave a review
    window.open('https://chromewebstore.google.com/detail/ucsd-podcast-silence-fast/hhambeeokedhfflpgbkcbobiadfbmbfp/reviews', '_blank');
    // You should replace 'your-extension-id' with the actual ID of your extension
    ratingWindow.remove(); // Remove the rating window after opening the review page
    localStorage.setItem('extensionRatingWindowClosed', Infinity);
  });

  document.getElementById('dismissButton').addEventListener('click', function() {
    // Dismiss the window without taking any action
    ratingWindow.remove();
    localStorage.setItem('extensionRatingWindowClosed', 10+Math.random() * 10);
  });
}