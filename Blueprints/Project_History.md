# Project History & Discussion Log

## Initial Request
**User Goal**: Automate the post-upload workflow for "Crazy Wisdom" podcast episodes.
- **Inputs**: MP4 file and Transcript (uploaded to Google Drive).
- **Desired Outputs**:
    - "Stable Link" (later defined as a Chat Interface).
    - "Agentic Behavior" (Hashtags, Clips, Show Notes).
    - Folder organization.

## Planning Phase Highlights

### 1. Defining "Stable Link"
- **Initial Thought**: Standard Drive link.
- **User Clarification**: A website where the user can "chat with an LLM about the contents of the transcript".
- **Decision**: For **V1**, the output will be a **Google Doc** containing the metadata. The Chat Interface is deferred to **V2**.

### 2. Defining "Agentic Behavior"
- **Constraint**: The Agent cannot "watch" the video to learn the style.
- **User Input**: Provided a detailed "Play-by-Play" of the manual workflow.
- **Requirements**:
    - **Hashtags**: 5-10 relevant tags.
    - **Clip Candidates**: 5-7 segments with timestamps, hooks, and rationale (Text only for V1).
    - **Show Notes**: YouTube Title/Description, Transistor Summary.

### 3. Architecture & Platform
- **Question**: Background Utility (Apps Script) vs. Standalone Web App?
- **Decision**: **Hybrid**.
    - **Storage**: Google Drive (Background Utility).
    - **Intelligence**: Gemini API via Apps Script.
    - **V1 Output**: Google Doc (Fastest value).
    - **V2 Output**: Web App (for interactive chat).

### 4. Folder Structure & Naming
- **Problem**: Raw filenames (e.g., "Fred Vogelstein.mp4") do not contain the Episode Number (e.g., "Ep062").
- **Solution (User Provided)**: **Master Sheet Lookup**.
    - The script will search the "Crazy Wisdom Episodes" Google Sheet for the Guest Name found in the filename.
    - It will retrieve the Episode Number from that row.
    - Target Folder Name: `Ep[Number]_[Guest Name]`.

## Key Resources Provided
- **Master Sheet**: `Crazy Wisdom Episodes` (ID: `1krhOA_nLH5kO-mX2AjyAjlHOkU23cun9DI_SxZ1_OA8`)
- **Video Walkthroughs**:
    - `Generating Engaging Clips and Hashtags...`
    - `Downloading and Uploading Raw Files...`

## Current Status
- **Plan**: Complete.
- **Blueprints**: Documented in `Blueprints/`.
- **Implementation**: Paused. Ready to start coding `Code.js` upon approval.
