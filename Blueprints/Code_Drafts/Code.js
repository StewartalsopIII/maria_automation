/**
 * Maria Automation - Google Apps Script
 * 
 * Automates the post-upload workflow for Crazy Wisdom podcast episodes.
 * 
 * Features:
 * 1. Watches a specific "Drop Folder" for new MP4 and Transcript files.
 * 2. Identifies the Guest Name from the filename.
 * 3. Looks up the Episode Number from the "Crazy Wisdom Episodes" Master Sheet.
 * 4. Creates/Finds a structured folder (e.g., "Ep062_Fred Vogelstein").
 * 5. Moves files to the structured folder.
 * 6. Sends the transcript to Gemini API to generate:
 *    - Hashtags
 *    - Clip Candidates
 *    - Show Notes (YouTube Title/Desc, Transistor Summary)
 * 7. Saves the generated content to a Google Doc in the folder.
 */

// --- CONFIGURATION ---
const CONFIG = {
  // The ID of the "Crazy Wisdom Episodes" Google Sheet
  MASTER_SHEET_ID: '1krhOA_nLH5kO-mX2AjyAjlHOkU23cun9DI_SxZ1_OA8',

  // Name of the sheet/tab within the spreadsheet
  SHEET_NAME: 'Episodes', // <--- PLEASE VERIFY THIS NAME

  // Column Headers (Case-sensitive) or Index (1-based)
  // Adjust these based on your actual sheet layout
  COL_EPISODE_NUMBER: 1, // Column A (assuming Episode Number is here)
  COL_GUEST_NAME: 2,     // Column B (assuming Guest Name is here)

  // ID of the folder where Maria drops the raw files
  // You will need to set this after creating the folder
  DROP_FOLDER_ID: 'REPLACE_WITH_DROP_FOLDER_ID',

  // Gemini API Key (Store in Script Properties for security, but defined here for initial setup)
  GEMINI_API_KEY: 'REPLACE_WITH_YOUR_GEMINI_API_KEY',

  // Gemini Model
  GEMINI_MODEL: 'gemini-1.5-flash'
};

/**
 * Main Trigger Function
 * Run this manually or set up a Time-driven trigger (e.g., every 10 minutes)
 */
function processNewFiles() {
  const dropFolder = DriveApp.getFolderById(CONFIG.DROP_FOLDER_ID);
  const files = dropFolder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const filename = file.getName();

    // Skip temporary files or already processed ones (if any logic exists)
    if (filename.startsWith('Ep')) continue; // Assume already processed if starts with Ep

    // Identify file type
    const mimeType = file.getMimeType();

    // We primarily look for the MP4 to start the process, 
    // assuming the transcript is named similarly or we search for it.
    if (mimeType === 'video/mp4') {
      processEpisodeFiles(file, dropFolder);
    }
  }
}

function processEpisodeFiles(videoFile, dropFolder) {
  Logger.log(`Processing file: ${videoFile.getName()}`);

  // 1. Extract Guest Name from Filename
  // Assumption: Filename is like "Fred Vogelstein.mp4" or "Interview with Fred Vogelstein.mp4"
  // Simple logic: Remove extension and use the rest as the key.
  const guestNameCandidate = videoFile.getName().replace(/\.mp4$/i, '').trim();

  // 2. Lookup Episode Number
  const episodeData = lookupEpisodeData(guestNameCandidate);

  if (!episodeData) {
    Logger.log(`Could not find episode data for guest: ${guestNameCandidate}`);
    // Optional: Send email alert
    return;
  }

  const { episodeNumber, fullGuestName } = episodeData;
  const newFolderName = `Ep${episodeNumber}_${fullGuestName}`;

  Logger.log(`Found Episode: ${episodeNumber} for Guest: ${fullGuestName}`);

  // 3. Create/Find Target Folder
  const parentFolder = dropFolder.getParents().next(); // Create in the same parent as Drop Folder? Or specific root?
  // For now, let's create it inside the Drop Folder's parent to keep it organized
  const targetFolder = getOrCreateFolder(parentFolder, newFolderName);

  // 4. Find the Transcript File
  // Assumption: Transcript has same basename or contains guest name
  const transcriptFile = findTranscriptFile(dropFolder, guestNameCandidate);

  // 5. Move Files
  videoFile.moveTo(targetFolder);
  videoFile.setName(`${newFolderName}.mp4`); // Rename for consistency

  let transcriptText = "";
  if (transcriptFile) {
    transcriptFile.moveTo(targetFolder);
    transcriptFile.setName(`${newFolderName}_Transcript.txt`);
    transcriptText = transcriptFile.getBlob().getDataAsString();
  } else {
    Logger.log("No transcript file found. Skipping Gemini generation.");
    // We still moved the video, so we stop here or continue without text.
    return;
  }

  // 6. Generate Content with Gemini
  if (transcriptText) {
    const generatedContent = callGeminiAPI(transcriptText);

    // 7. Create Google Doc
    createOutputDoc(targetFolder, newFolderName, generatedContent);
  }
}

/**
 * Looks up the episode number in the Master Sheet
 */
function lookupEpisodeData(searchName) {
  const sheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  // Normalize search name (lowercase, remove extra spaces)
  const normalizedSearch = searchName.toLowerCase();

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const sheetGuestName = String(row[CONFIG.COL_GUEST_NAME - 1]).toLowerCase();

    // Fuzzy match: Check if the search name is contained in the sheet name or vice versa
    if (sheetGuestName.includes(normalizedSearch) || normalizedSearch.includes(sheetGuestName)) {
      return {
        episodeNumber: row[CONFIG.COL_EPISODE_NUMBER - 1],
        fullGuestName: row[CONFIG.COL_GUEST_NAME - 1]
      };
    }
  }
  return null;
}

/**
 * Calls Gemini API to generate metadata
 */
function callGeminiAPI(transcript) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const prompt = `
    You are an expert podcast producer. Analyze the following transcript for the "Crazy Wisdom" podcast.
    
    Transcript:
    ${transcript.substring(0, 30000)} ... [truncated for length if needed]
    
    Please generate the following outputs:
    
    1. **Hashtags**: Create 5-10 relevant hashtags. Format: #tag1, #tag2.
    2. **Clip Candidates**: Find 5-7 engaging clips (15-90s). For each, provide:
       - Timestamp (approximate)
       - Hook (The engaging line)
       - Rationale (Why this clip works)
    3. **Show Notes**:
       - YouTube Title (Catchy, SEO-optimized)
       - YouTube Description (Summary + Key Takeaways)
       - Transistor Show Notes (Brief summary for audio feed)
  `;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text;
    } else {
      Logger.log("Gemini API Error: " + JSON.stringify(json));
      return "Error generating content.";
    }
  } catch (e) {
    Logger.log("API Request Failed: " + e.toString());
    return "API Request Failed.";
  }
}

/**
 * Creates a Google Doc with the generated content
 */
function createOutputDoc(folder, baseName, content) {
  const doc = DocumentApp.create(`${baseName}_ShowNotes`);
  const body = doc.getBody();

  body.appendParagraph("Crazy Wisdom - Episode Automation Output").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Generated for: ${baseName}`);
  body.appendHorizontalRule();

  body.appendParagraph(content);

  // Move doc to the target folder (DocumentApp creates in root by default)
  const docFile = DriveApp.getFileById(doc.getId());
  docFile.moveTo(folder);
}

// --- HELPER FUNCTIONS ---

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent.createFolder(name);
  }
}

function findTranscriptFile(folder, guestName) {
  const files = folder.getFiles();
  const normalizedGuest = guestName.toLowerCase();

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName().toLowerCase();
    const type = file.getMimeType();

    // Look for text files or PDFs that contain the guest name
    if ((type === 'text/plain' || type === 'application/pdf' || type === 'application/vnd.google-apps.document') &&
      name.includes(normalizedGuest)) {
      return file;
    }
  }
  return null;
}
