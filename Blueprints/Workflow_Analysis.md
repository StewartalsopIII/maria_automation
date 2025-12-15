# Workflow Analysis: Maria Automation

## Video 1: Generating Engaging Clips & Hashtags
**Goal**: Transform a raw episode transcript into viral clips with captions, hooks, and hashtags using ChatGPT and Riverside.

### Phase 1: Data Extraction & Strategy (ChatGPT)
- **Input**: Google Sheet "Crazy Wisdom Episodes" (Prompt Templates).
- **Action**: Copy Prompt #1 (Hashtags) -> Paste to ChatGPT with Transcript.
- **Output**: List of hashtags.
- **Action**: Copy Prompt #2 (Clip Discovery) -> Paste to ChatGPT with Keywords.
- **Output**: List of clips (Title, Timestamp, Hook, Rationale).
- **Decision**: Manual selection of one clip.

### Phase 2: Video Production (Riverside.fm)
- **Action**: Create new Edit in Riverside.
- **Action**: Trim to timestamp.
- **Action**: Apply "Remove Pauses" and "Remove Filler Words" (AI Tools).
- **Action**: Set Layout to "Smart - Frequent".
- **Action**: Add Captions (Purple style, bottom center).
- **Action**: Change Aspect Ratio to 9:16.
- **Action**: Add Hook Text (Top Center, first 10s).
- **Action**: Add CTA Text (Bottom Center, last 10s).
- **Action**: Export (Normalize Audio, Remove Noise).

## Video 2: Archiving Raw Files
**Goal**: Process a specific track, render it, download it, and archive it to Google Drive.

### Phase 1: Processing (Riverside)
- **Action**: Select "All Participants" track -> Download -> Export 1080p Grid.
- **Action**: Change Layout to "Smart - Frequent".
- **Action**: Export (Normalize Audio, Remove Noise).
- **Action**: Wait for processing -> Download MP4.

### Phase 2: Archival (Google Drive)
- **Action**: Navigate to `Ep[XXX]_[Description]` folder.
- **Action**: Drag and drop MP4 file.

## Automation Logic Derived
1. **Master Sheet Lookup**: Use "Crazy Wisdom Episodes" sheet to map Guest Name -> Episode Number.
2. **Folder Naming**: `Ep[Number]_[Guest Name]`.
3. **Gemini Tasks**:
    - Generate Hashtags.
    - Generate Clip Candidates (Metadata only for V1).
    - Generate Show Notes.
4. **Output**: Google Doc in the target folder.
