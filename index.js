function setPlaybackSpeed(speed) {
    let videoElement = getVideoElement();
    videoElement.playbackRate = speed;
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
      const startTime = removeAfterFirstComma(match[2]);
      const endTime = removeAfterFirstComma(match[3]);
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

async function getVideoCaptions() {
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
    }
    return document.ff_downtime_captions;
}

function findCaptionByTime(captions, targetTime) {
    let low = 0;
    let high = captions.length - 1;
  
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const currentCaption = captions[mid];
  
      const startTime = timeStampToSeconds(currentCaption.startTime);
      const endTime = timeStampToSeconds(currentCaption.endTime);
  
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
  async function getCaptionsInRange(startTime, endTime) {
    const captions = await getVideoCaptions();
    let startSeconds = startTime;
    let endSeconds = endTime;
    if(typeof(startTime) === "string"){
        // Convert start and end times to seconds
        startSeconds = timeStampToSeconds(startTime);
        endSeconds = timeStampToSeconds(endTime);
    }
  
    // Filter captions based on the time range
    const captionsInRange = captions.filter(caption => {
      const captionStartTime = timeStampToSeconds(caption.startTime);
      const captionEndTime = timeStampToSeconds(caption.endTime);
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

async function getCurrentCaption(margin = -1){
    const currentTime = getVideoElement().currentTime;
    if(margin == -1){
        return getCaptionsInRange(Math.max(currentTime-margin, 0), currentTime+margin);
    }
    return findCaptionByTime(await getVideoCaptions(), currentTime);
}

const FAST_SPEED = 15;
const NORM_SPEED = 2;

async function tryFF(){
    const currentCaption = await getCurrentCaption(2);
    if(currentCaption === null){
        setPlaybackSpeed(FAST_SPEED);
        if(!document.wasFastSpeed){
            console.log("Switched to fast speed.");
            document.wasFastSpeed = true;
        }
    }
    else{
        setPlaybackSpeed(NORM_SPEED);
        if(document.wasFastSpeed){
            console.log("Switched to normal speed.");
            document.wasFastSpeed = false;
        }
    }
}

setInterval(tryFF, 10);