# Maria Automation Implementation Plan

# Goal Description
Automate the post-upload workflow for podcast episodes. The automation will trigger when an MP4 file and a transcript are placed in a specific Google Drive folder. It will perform various processing steps, including creating a stable link and utilizing the Gemini API for agentic tasks.

## User Review Required
> [!IMPORTANT]
> **Master Sheet Config**: The script requires the ID of the "Crazy Wisdom Episodes" Google Sheet and the specific column names for "Guest Name" and "Episode Number".

## Proposed Changes
### Google Apps Script
#### [NEW] Code.js
- **Trigger**: Watch for new files in a specific "Drop Folder".
- **Logic**:
    - **Input**: Detect MP4 and Transcript (TXT/PDF) pair.
    - **Metadata Lookup (Master Sheet)**:
        - Extract "Guest Name" from filename (e.g., "Fred Vogelstein.mp4" -> "Fred Vogelstein").
        - Search "Crazy Wisdom Episodes" Sheet (Configurable ID) for the Guest Name.
        - Retrieve **Episode Number** (e.g., "062") from the corresponding row.
    - **Organization**:
        - Create/Find target folder: `Ep[Number]_[Guest Name]`.
        - Move MP4 and Transcript to this folder.
    - **Agentic Processing (Gemini API)**:
        - *Prompt 1 (Hashtags)*: "Create 5-10 hashtags... exclude irrelevant ones... format: #word1, #word2."
        - *Prompt 2 (Clip Discovery)*: "Analyze transcript... find 5-7 engaging clips... timestamps... hook... rationale."
        - *Prompt 3 (Show Notes)*: "Generate YouTube title, description, and Transistor show notes."
        - *Output*: Create a **Google Doc** in the target folder with all generated content.

#### [NEW] appsscript.json
- Manifest file including necessary scopes (Drive, Docs, Spreadsheets, External Services).

#### [DELETE] chat_interface.html
- (Deferred to V2)

## Verification Plan
### Manual Verification
- User will upload test files to the designated Drive folder.
- Verify that the script runs and performs the expected actions (links created, API called, files moved).
