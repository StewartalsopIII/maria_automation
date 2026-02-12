# Workflow Automation Status

> Canonical reference for tracking what's automated, what's manual, and what's planned.
>
> Back to: [CLAUDE.md](../CLAUDE.md) | [README.md](../README.md) | [ARCHITECTURE.md](../docs/ARCHITECTURE.md) | [KNOWN_ISSUES.md](../docs/KNOWN_ISSUES.md)

---

## Video References (Single Source of Truth)

These Loom tutorials by Maria Pujol document the Riverside.fm workflow:

| Order | Title | Duration | Link |
|-------|-------|----------|------|
| 1 | Creating Engaging Clips from Episodes | 5:00 | [Loom](https://www.loom.com/share/7aa50673b2a9426890012c384c419764) |
| 2 | Video Clips Formatting, Hook and CTA | 5:00 | [Loom](https://www.loom.com/share/297f5bffae524517b41e4372ce8ff709) |
| 3 | Clip Background Music, Audio Quality and Export | 2:29 | [Loom](https://www.loom.com/share/c6694db6d70b4a17a0187193deba1382) |
| 4 | Creating Engaging Calls to Action for Podcast Clips | 2:00 | [Loom](https://www.loom.com/share/d0d03df01456444f8081370415694d9c) |

**Video 1** covers: Clip selection from Master Doc, timestamp navigation, initial trimming
**Video 2** covers: 9:16 format, AI tools (remove pauses), smart layouts, captions, hooks, CTAs
**Video 3** covers: Background music, volume adjustment, Magic Audio, export settings
**Video 4** covers: Generating CTAs with ChatGPT using clip context + full transcript

**Legend:**
- ✅ **Automated** - Currently working in the system
- 🔧 **To-Be-Automated** - Planned or possible to automate
- 📥 **Automatable Input** - Step is manual (in Riverside), but the *content* can be auto-generated
- 👤 **Manual** - Requires human judgment/action (always manual)

---

## IMPLEMENTATION BACKLOG

**What still needs to be built** (in priority order):

| # | Task | Status | Effort | What It Does |
|---|------|--------|--------|--------------|
| 1 | Fix social posts: 1 per clip | 🔧 To-Do | Low | Change from 3 generic posts → 6-7 clip-specific posts |
| 2 | Add CTA generation | 🔧 To-Do | Low | Auto-generate 1 CTA per clip using provided prompt |
| 3 | Tie posts to clips | 🔧 To-Do | Low | Each post references its clip's hook/content |

**Code locations:**
- Social posts: `generateSocialPosts()` in `gas_project/Code.gs`
- CTAs: New function `generateCTAs()` to add

---

## 1. Transcript Processing & Show Notes Generation

### Phase 1: Input
| Step | Status | Description |
|------|--------|-------------|
| Upload transcript to Google Drive | 👤 Manual | User uploads `.txt` file to watched folder |
| Detect new transcript file | ✅ Automated | 5-minute trigger monitors folder |
| Extract metadata (guest name, podcast type) | ✅ Automated | Regex parsing of filename |

### Phase 2: Content Generation
| Step | Status | Description |
|------|--------|-------------|
| Generate episode titles (10 options) | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate timestamps (every 5 min) | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate key insights (7 items) | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate intro paragraph | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate hashtags (5-10) | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate keywords | ✅ Automated | Claude Sonnet 4 via OpenRouter |
| Generate clip suggestions (5-7) | ✅ Automated | Includes timestamps, hooks, captions |
| Generate social media posts | ✅ Automated | **Currently 3 posts** |
| Generate links/books mentioned | ✅ Automated | Recently added |
| Generate YouTube show notes | ✅ Automated | Special format for 5,000 char limit |

### Phase 3: Output
| Step | Status | Description |
|------|--------|-------------|
| Create organized folder structure | ✅ Automated | By show type and guest name |
| Create Master Doc with all content | ✅ Automated | Single Google Doc with all sections |
| Create individual section docs | ✅ Automated | Separate docs for each content type |
| Generate episode artwork | ✅ Automated | Stewart Squared only (Flux 2 Pro) |

---

## 2. Video Clip Creation (Riverside.fm)

This workflow transforms clip suggestions from the Master Doc into finished social media clips.

### Phase 1: Clip Selection
| Step | Status | Description |
|------|--------|-------------|
| Read clip suggestions from Master Doc | 👤 Manual | Review 5-7 suggested clips |
| Choose clips to produce | 👤 Manual | Select based on quality/relevance |
| Validate timestamp accuracy | 👤 Manual | Listen to verify clip boundaries |

### Phase 2: Initial Edit Setup
| Step | Status | Description |
|------|--------|-------------|
| Open episode in Riverside | 👤 Manual | Navigate to correct recording |
| Create new Edit | 👤 Manual | Click menu → Edit → Create |
| Navigate to timestamp | 👤 Manual | Use suggested timestamp as starting point |
| Split at clip start (with buffer) | 👤 Manual | ~30 sec before suggested start |
| Split at clip end (with buffer) | 👤 Manual | ~30 sec after suggested end |
| Delete unused portions | 👤 Manual | Remove before/after segments |

### Phase 3: Content Trimming
| Step | Status | Description |
|------|--------|-------------|
| Listen and refine boundaries | 👤 Manual | Fine-tune exact start/end points |
| Remove redundant sentences | 👤 Manual | Cut content that doesn't serve the clip |
| Remove filler words (uh, um) | 👤 Manual | Or use AI tool below |

### Phase 4: Format & AI Enhancement
| Step | Status | Description |
|------|--------|-------------|
| Change aspect ratio to 9:16 | 👤 Manual | Top menu → Format → 9:16 |
| Apply "Remove Pauses" | 👤 Manual | Right sidebar → AI Tools → Remove Pauses |
| Set Smart Layout to "Frequent" | 👤 Manual | Right sidebar → Layout → Smart → Frequent |
| Add captions (2 lines, bottom) | 👤 Manual | Right sidebar → Captions → Style → Position |

### Phase 5: Hook & CTA
| Step | Status | Description |
|------|--------|-------------|
| Copy hook from Master Doc | ✅ Automated | Hook already generated in clip suggestion |
| Add hook text overlay | 👤 Manual | Right sidebar → Text → Paste hook |
| Position hook (top, 5-10 sec) | 👤 Manual | Drag to top, adjust duration |
| Add empty section at end | 👤 Manual | Timeline → Plus → Empty Section |
| Generate CTA text | 📥 Automatable | **Currently manual (ChatGPT) → TO BE AUTOMATED** |
| Import CTA background | 👤 Manual | Pre-made in Canva, upload once |

### Phase 6: Audio & Music
| Step | Status | Description |
|------|--------|-------------|
| Select background music | 👤 Manual | Choose track that fits clip tone |
| Upload music (if new) | 👤 Manual | Right sidebar → Music → Upload |
| Insert music track | 👤 Manual | Click plus on track |
| Adjust music volume (~8-10%) | 👤 Manual | Three dots → Volume & Effects |
| Set fade in/out (optional) | 👤 Manual | Toggle in Volume & Effects panel |
| Apply Magic Audio (if needed) | 👤 Manual | AI Tools → Magic Audio → Apply |

### Phase 7: Export
| Step | Status | Description |
|------|--------|-------------|
| Final review/playback | 👤 Manual | Check audio balance, hook visibility |
| Click Export | 👤 Manual | Top right → Export button |
| Enable Normalize Audio | 👤 Manual | Toggle in export settings |
| Enable Remove Background Noise | 👤 Manual | Toggle in export settings |
| Export video | 👤 Manual | Click Export Video |
| Download rendered file | 👤 Manual | Wait for processing, download |

---

## 3. Social Media Posting

| Step | Status | Description |
|------|--------|-------------|
| Generate social posts (1 per clip) | 📥 Automatable | **BROKEN: Only generates 3 posts, should be 6-7** |
| Tie posts to specific clips | 📥 Automatable | **MISSING: Posts are generic, not clip-specific** |
| Upload clip to platform | 👤 Manual | YouTube Shorts, Instagram, TikTok, etc. |
| Paste post copy | 👤 Manual | Copy from Master Doc |
| Add hashtags | ✅ Automated | Already generated in Master Doc |
| Schedule/publish | 👤 Manual | Platform-specific |

---

## 4. Implementation Details

### Task 1: Fix Social Media Posts (1 per clip)
**File:** `gas_project/Code.gs` → `generateSocialPosts()`

| Current | Target |
|---------|--------|
| 3 generic posts | 6-7 posts (1 per clip) |
| Not tied to clips | Each post uses its clip's hook/content |

**Implementation approach:**
- Modify prompt to generate one post per clip
- Pass clip suggestions as input so posts reference specific content

---

### Task 2: Add CTA Generation (1 per clip)
**File:** `gas_project/Code.gs` → New function `generateCTAs()`

**Prompt to use:**
```
Write a CTA, like the examples below, that follows the ending of the clip shown below to generate some intrigue, make people want to hear more/finish listening to what follows. Use the whole transcript of the conversation to include something like a mention/question to the audience if they would like to know more about something specific about what the guest says in the clip (in the case the guest goes deeper into that) or if they would like to know how what is being said in the clip relates to other topics in the full conversation.

Example 1: Want to find out where Garrett believes America sits in the ancient cycle of power and what might be coming next? Subscribe to Crazy Wisdom on Spotify and YouTube and hear the full episode.

Example 2: Catch the rest on Stewart Squared, as we break down the early signs of who's set to dominate the next decade of AI. And make sure to subscribe on Spotify and YouTube for more episodes like this.

Example 3: Want to find out who Garrett thinks is the modern master of gathering power? Subscribe to Crazy Wisdom on Spotify and YouTube to catch the rest of this conversation and listen to more episodes like this.

[CLIP CONTENT HERE]
```

**Implementation notes:**
- Run after `generateClips()` so clip content is available
- Pass each clip's text + full transcript to the prompt
- Use podcast name (Crazy Wisdom vs Stewart Squared) dynamically
- Output: One CTA per clip in a new "CALL TO ACTIONS" section of Master Doc

---

## 5. Future Automation Opportunities

Beyond the current backlog, these could be explored later:

| Opportunity | Effort | Value | Notes |
|-------------|--------|-------|-------|
| Music suggestions per clip | Medium | Medium | Suggest tracks based on clip tone/mood |
| Platform-specific post variants | Medium | Medium | Different copy for IG vs TikTok vs YouTube |
| Auto-generate Canva CTA images | High | Medium | Would require Canva API integration |

### Always Manual (Human Judgment Required)
| Step | Reason |
|------|--------|
| Clip selection from suggestions | Creative decision about what resonates |
| Boundary refinement in Riverside | Requires listening and judgment |
| Volume balancing | Subjective audio quality check |
| Final review before export | Quality assurance |

---

## 6. Riverside.fm Quick Reference

### Sidebar Icons (Right Side, Top to Bottom)
1. Clips
2. Transcript
3. Comments
4. Speakers
5. Layout
6. Background
7. Captions
8. **Music** (for background tracks)
9. Text
10. **AI Tools** (Remove Pauses, Magic Audio)

### Key Shortcuts
- Split: Click timeline → Split button
- Delete: Select segment → Delete
- Export: Top right purple button

### AI Tools Available
- **Remove Pauses**: Automatically trims silence
- **Remove Filler Words**: Cuts "um", "uh", etc.
- **Magic Audio**: Enhances voice clarity, reduces noise

### Export Settings
- Resolution: 1080p
- Normalize Audio Levels: Recommended ON
- Remove Background Noise: Recommended ON (if Magic Audio not used)
