// ===========================================
// PODCAST SHOW NOTES AUTOMATION
// Google Apps Script + OpenRouter (Claude Sonnet 4)
// ===========================================

// CONFIGURATION - UPDATE THESE
const CONFIG = {
  // API key stored securely in Script Properties (see setup instructions below)
  OPENROUTER_API_KEY: PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'),
  INPUT_FOLDER_ID: '1o8b_1_0ak-MAI2fM38wWIAlARZYcgMaG',
  OUTPUT_FOLDER_ID: '1AfMTWGH30UoaB5xSf5aRsp07xVHrKYXn',
  MODEL: 'anthropic/claude-sonnet-4.5',
  IMAGE_MODEL: 'black-forest-labs/flux.2-pro',
  GENERATE_IMAGES: true,
  IMAGE_SIZE: 2048,
  SITE_URL: 'https://crazywisdom.com',
  SITE_NAME: 'Crazy Wisdom Podcast'
};

// ===========================================
// SETUP FUNCTION - RUN ONCE TO STORE API KEY
// ===========================================
// After deploying this script, run this function ONCE to securely store your API key
// Then delete or comment out this function
function setupAPIKey() {
  const apiKey = 'PASTE_YOUR_NEW_API_KEY_HERE';
  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
  Logger.log('API key stored securely in Script Properties');
}

// ===========================================
// MAIN TRIGGER FUNCTION
// ===========================================

function processNewTranscripts() {
  const inputFolder = DriveApp.getFolderById(CONFIG.INPUT_FOLDER_ID);
  const files = inputFolder.getFilesByType('text/plain');
  
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    
    if (fileName.startsWith('[PROCESSED] ')) {
      continue;
    }
    
    try {
      Logger.log('Processing: ' + fileName);
      
      const transcript = file.getBlob().getDataAsString();
      const metadata = extractMetadata(transcript);
      Logger.log('Detected show: ' + metadata.showType + ', Guest: ' + metadata.guestName);
      
      const guestFolder = createOutputFolders(metadata.showType, metadata.guestName);
      const showNotes = generateAllShowNotes(transcript, metadata);

      // Generate episode artwork FIRST (before doc creation) to avoid GAS 6-min timeout
      generateEpisodeArtwork(transcript, metadata, showNotes, guestFolder);

      createShowNotesDocs(guestFolder, showNotes, metadata);
      createMasterDoc(guestFolder, showNotes, metadata);

      file.setName('[PROCESSED] ' + fileName);
      Logger.log('Successfully processed: ' + fileName);
      
    } catch (error) {
      Logger.log('Error processing ' + fileName + ': ' + error.message);
      file.setName('[FAILED] ' + fileName);
      sendErrorEmail(fileName, error);
    }
  }
}

// ===========================================
// METADATA EXTRACTION
// ===========================================

function extractMetadata(transcript) {
  const prompt = `Analyze this podcast transcript and extract:
1. The guest's full name (not Stewart Alsop III - he's the host. IMPORTANT: Host name is spelled "Stewart" with "ew", not "Stuart")
2. Whether this is "Crazy Wisdom" or "Stewart Squared" podcast

Rules:
- "Stewart Squared" episodes feature Stewart Alsop II (the father) or discussions between two Stewarts
- "Crazy Wisdom" episodes feature external guests
- Look at speaker labels and context to determine this

Respond in JSON format only:
{"guestName": "First Last", "showType": "crazy-wisdom" or "stewart-squared"}

Transcript (first 2000 chars):
${transcript.substring(0, 2000)}`;

  const response = callOpenRouter(prompt, 200);
  
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      guestName: parsed.guestName || 'Unknown Guest',
      showType: parsed.showType || 'crazy-wisdom'
    };
  } catch (e) {
    Logger.log('Failed to parse metadata: ' + e.message);
    return {
      guestName: 'Unknown Guest',
      showType: 'crazy-wisdom'
    };
  }
}

// ===========================================
// FOLDER MANAGEMENT
// ===========================================

function createOutputFolders(showType, guestName) {
  const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  
  let showFolder;
  const showFolders = outputFolder.getFoldersByName(showType);
  if (showFolders.hasNext()) {
    showFolder = showFolders.next();
  } else {
    showFolder = outputFolder.createFolder(showType);
  }
  
  const dateStr = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  const guestFolderName = guestName + ' - ' + dateStr;
  const guestFolder = showFolder.createFolder(guestFolderName);
  
  return guestFolder;
}

// ===========================================
// SHOW NOTES GENERATION
// ===========================================

function generateAllShowNotes(transcript, metadata) {
  const showNotes = {};

  showNotes.titles = generateTitles(transcript, metadata);
  showNotes.timestamps = generateTimestamps(transcript, metadata);
  showNotes.keyInsights = generateKeyInsights(transcript, metadata);
  showNotes.keyInsightsYouTube = generateKeyInsights(transcript, metadata, 'youtube');
  showNotes.intro = generateIntro(transcript, metadata);
  showNotes.hashtags = generateHashtags(transcript, metadata);
  showNotes.keywords = generateKeywords(transcript, metadata);
  showNotes.clips = generateClipSuggestions(transcript, metadata);
  showNotes.socialPosts = generateSocialPosts(transcript, metadata, showNotes.hashtags, showNotes.clips);
  showNotes.ctas = generateCTAs(transcript, metadata, showNotes.clips);
  showNotes.links = generateLinks(transcript, metadata);

  return showNotes;
}

function generateTitles(transcript, metadata) {
  const prompt = `Give me 10 possible titles for this podcast episode. Make them creative and analyze the host's part of the conversation (Stewart Alsop III) to get a sense for his voice. It's not necessary to describe the analysis, just list the titles.

Guest: ${metadata.guestName}

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 1000);
}

function generateTimestamps(transcript, metadata) {
  const prompt = `Give me timestamps for this episode of every five minutes from the beginning to the end without worrying about the intro or outro. Make sure to include what was discussed at each part of the episode. Do it without brackets and only create a 00:00:00 format if there is more than 60 minutes of content otherwise keep it like 00:00. Make it no longer than 1100 characters, making emphasis on the conversation key words. Make each timestamp one or two phrases in narrative form.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 1500);
}

function generateKeyInsights(transcript, metadata, variant = 'default') {
  const prompts = {
    default: `Give me 7 key insights from this episode in a numbered list in full paragraph form. Maximum 2200 characters.`,
    youtube: `Give me 7 key insights from this episode in a numbered list. Keep each insight SHORT (200-250 characters, 1-2 sentences). Focus on core takeaways only.`
  };

  const prompt = `${prompts[variant]}

Guest: ${metadata.guestName}

Transcript:
${transcript}`;

  return callOpenRouter(prompt, variant === 'youtube' ? 2000 : 2500);
}

function generateIntro(transcript, metadata) {
  const prompt = `Give me an intro to the topics discussed mentioning the host Stewart Alsop (spelled Stewart with "ew", not Stuart) and the guest's full name ${metadata.guestName}. Also add any links to show notes that were mentioned for the guest. Make it only one paragraph and avoid using the word "delve" or sounding like ChatGPT.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 800);
}

function generateHashtags(transcript, metadata) {
  const prompt = `You are an expert in social media growth and hashtag strategy. Based on the full transcript, create 5-10 hashtags that are:
- Episode-specific based on keywords, key topics, and search intent
- Short and not too specific
- Serving the aim of discovery
- Exclude irrelevant or spammy hashtags

Make sure hashtags vary in popularity:
- Low competition (<50K posts) for niche discovery
- Medium competition (50K–500K) for steady reach
- High competition (>500K) for broader exposure

List them with the format: #word1, #word2, etc.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 500);
}

function generateKeywords(transcript, metadata) {
  const prompt = `Give me the keywords from the episode in a list in sentence form with commas in between each keyword.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 500);
}

function generateClipSuggestions(transcript, metadata) {
  const prompt = `Analyze this podcast transcript and find 5-7 engaging clips for social media.

IMPORTANT: Use EXACTLY this format for each clip (no intro text, start directly with CLIP 1):

CLIP 1: "[Clip Title]"
Hook: [A strong hook that makes people stop scrolling]
Caption: [A suggested caption/title for social media]
Timestamp: [Start time - End time from transcript]
Text: "[At least 80 words excerpt from the transcript]"
Why it works: [Brief note on why this moment is engaging]

CLIP 2: "[Clip Title]"
Hook: [Hook for clip 2]
Caption: [Caption for clip 2]
Timestamp: [Timestamp for clip 2]
Text: "[Text excerpt for clip 2]"
Why it works: [Why clip 2 works]

[Continue for all 5-7 clips...]

Guidelines:
- Keep clips between 15–90 seconds long for Instagram Reels/TikTok
- Highlight only the most shareable, insightful, impactful, or belief-changing moments
- Start DIRECTLY with "CLIP 1:" - do not include any introduction or preamble

Target audience:
- Demographics: 25–45 years old, global with strong North America and Europe presence
- Psychographics: Curious, open-minded, skeptical of surface-level trends. Interested in technology, consciousness, business, and human potential.
- Behaviors: Engage with podcasts, YouTube interviews, thought-leadership. Follow thought leaders on X/Twitter, LinkedIn. Value depth over clickbait.

Transcript:
${transcript}`;

  return callOpenRouter(prompt, 4000);
}

function generateSocialPosts(transcript, metadata, hashtags, clips) {
  const prompt = `Based on the clip suggestions below, write ONE social media post for EACH clip. There should be 5-7 posts total (one per clip).

For each post (under 120 words each):
- Start with an engaging rhetorical question that ties into the clip's theme
- Add a one-two sentence description highlighting the insight or tension from that specific clip
- Close with the listener takeaway

Keep the tone curious, thought-provoking, and designed for an audience of tech-savvy, open-minded knowledge workers. Make it conversational, handwritten style, like it's written in first person as if the guest is speaking. Don't use the symbol "-" in the text.

Format your response as:

POST 1 (for Clip 1):
[Social media post for first clip]

POST 2 (for Clip 2):
[Social media post for second clip]

POST 3 (for Clip 3):
[Social media post for third clip]

[Continue for all clips...]

Guest: ${metadata.guestName}
Keywords/Hashtags: ${hashtags}

Clip Suggestions:
${clips}`;

  return callOpenRouter(prompt, 4000);
}

/**
 * Extract links and books from transcript
 * @param {string} transcript - The podcast transcript
 * @param {object} metadata - Guest name and show type
 * @returns {string} JSON string with links and books
 */
function generateLinks(transcript, metadata) {
  const prompt = `Extract URLs and books mentioned in this podcast transcript.

Return ONLY valid JSON with this structure:
{
  "links": [
    {"title": "Descriptive Title", "url": "https://example.com"}
  ],
  "books": [
    {"title": "Book Title", "author": "Author Name"}
  ]
}

Rules:
- Include only explicitly mentioned resources
- For partial URLs like "example dot com", format as: example.com
- For books without authors, use "Unknown Author"
- Empty arrays if category not present
- Add https:// if protocol missing

Transcript:
${transcript}`;

  try {
    const response = callOpenRouter(prompt, 2000);
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Basic validation
    if (!Array.isArray(parsed.links) || !Array.isArray(parsed.books)) {
      throw new Error('Invalid structure');
    }

    return cleaned;
  } catch (error) {
    Logger.log('Links extraction failed: ' + error.message);
    return JSON.stringify({links: [], books: []});
  }
}

/**
 * Generate call-to-actions (CTAs) for each clip
 * @param {string} transcript - The full podcast transcript
 * @param {object} metadata - Guest name and show type
 * @param {string} clips - The generated clip suggestions
 * @returns {string} CTAs for each clip
 */
function generateCTAs(transcript, metadata, clips) {
  // Determine show name for CTA
  const showName = metadata.showType === 'stewart-squared' ? 'Stewart Squared' : 'Crazy Wisdom';

  const prompt = `For each clip suggestion below, write a compelling Call-to-Action (CTA) that creates intrigue and makes viewers want to hear more of the full episode.

Guidelines:
- Each CTA should generate curiosity about what comes next in the conversation
- Reference specific topics the guest discusses later in the episode (use the full transcript)
- Include a question or mention to the audience about wanting to know more
- End with: "Subscribe to ${showName} on Spotify and YouTube" (vary the exact wording)
- Keep each CTA to 2-3 sentences max

Example CTAs:
- "Want to find out where Garrett believes America sits in the ancient cycle of power and what might be coming next? Subscribe to ${showName} on Spotify and YouTube and hear the full episode."
- "Catch the rest on ${showName}, as we break down the early signs of who's set to dominate the next decade of AI. And make sure to subscribe on Spotify and YouTube for more episodes like this."
- "Want to find out who Garrett thinks is the modern master of gathering power? Subscribe to ${showName} on Spotify and YouTube to catch the rest of this conversation and listen to more episodes like this."

Format your response as:

CTA 1 (for Clip 1):
[Call to action for first clip]

CTA 2 (for Clip 2):
[Call to action for second clip]

[Continue for all clips...]

Guest: ${metadata.guestName}
Show: ${showName}

Clip Suggestions:
${clips}

Full Transcript (for context on what comes later):
${transcript.substring(0, 15000)}`;

  return callOpenRouter(prompt, 3000);
}

// ===========================================
// YOUTUBE SHOW NOTES (5000 CHAR LIMIT)
// ===========================================

function generateYouTubeShowNotes(showNotes, metadata) {
  // Concatenate intro + placeholder for Riverside timestamps + shorter key insights
  let youtubeNotes = showNotes.intro + '\n\n';

  // Placeholder for Maria to paste Riverside chapter timestamps
  youtubeNotes += 'Timestamps\n';
  youtubeNotes += '[MARIA: Paste Riverside chapter timestamps here]\n\n';

  // Use shorter YouTube-optimized insights (remove markdown bold markers)
  const cleanedInsights = showNotes.keyInsightsYouTube.replace(/\*\*/g, '');
  youtubeNotes += 'Key Insights\n' + cleanedInsights;

  // Check if under 5000 characters (should be ~2800)
  if (youtubeNotes.length > 5000) {
    Logger.log('Warning: YouTube notes exceed 5000 chars (' + youtubeNotes.length + '). This should not happen.');
    youtubeNotes = youtubeNotes.substring(0, 4950) + '...\n\n[Truncated for YouTube limit]';
  }

  Logger.log('YouTube show notes length: ' + youtubeNotes.length + ' chars');
  return youtubeNotes;
}

// ===========================================
// DOCUMENT CREATION
// ===========================================

function createShowNotesDocs(folder, showNotes, metadata) {
  createDoc(folder, 'titles', '10 Episode Titles', showNotes.titles);
  createDoc(folder, 'timestamps', 'Timestamps', showNotes.timestamps);
  createDoc(folder, 'key-insights', 'Key Insights', showNotes.keyInsights);
  createDoc(folder, 'intro', 'Intro Paragraph', showNotes.intro);
  createDoc(folder, 'hashtags', 'Hashtags', showNotes.hashtags);
  createDoc(folder, 'keywords', 'Keywords', showNotes.keywords);
  createDoc(folder, 'clip-suggestions', 'Clip Suggestions', showNotes.clips);
  createDoc(folder, 'social-posts', 'Social Media Posts (1 per clip)', showNotes.socialPosts);
  createDoc(folder, 'ctas', 'Call-to-Actions (1 per clip)', showNotes.ctas);

  // Create YouTube-formatted show notes
  const youtubeNotes = generateYouTubeShowNotes(showNotes, metadata);
  createDoc(folder, 'youtube-show-notes', 'YouTube Show Notes (Under 5000 chars)', youtubeNotes);

  // Create standalone links document if we have links
  if (showNotes.links) {
    try {
      const linksData = JSON.parse(showNotes.links);
      if (linksData.links.length > 0 || linksData.books.length > 0) {
        const linksText = formatLinksForStandalone(showNotes.links);
        createDoc(folder, 'links', 'Links & Resources', linksText);
      }
    } catch (error) {
      Logger.log('Skipping standalone links doc: ' + error.message);
    }
  }
}

function createDoc(folder, slug, title, content) {
  const doc = DocumentApp.create(slug);
  const body = doc.getBody();
  
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  body.appendParagraph(content);
  
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  
  return doc;
}

// ===========================================
// CONTENT PARSERS FOR GROUPED CLIP OUTPUT
// ===========================================

/**
 * Parse clips text into array of individual clips
 * Splits on "CLIP N:" pattern and filters out any intro text
 * @param {string} clipsText - Raw clips text from LLM
 * @returns {string[]} Array of individual clip contents
 */
function parseClips(clipsText) {
  if (!clipsText) return [];

  // Split on "CLIP N" or "## Clip N" patterns (case insensitive)
  // This handles both new format "CLIP 1:" and old format "## Clip 1:"
  let clips = clipsText.split(/(?=(?:##?\s*)?CLIP\s*#?\d)/i);

  // Filter out any entries that don't start with a clip marker (removes intro text)
  // and clean up whitespace
  clips = clips
    .map(clip => clip.trim())
    .filter(clip => {
      // Only keep entries that actually start with a CLIP pattern
      return clip.length > 0 && /^(?:##?\s*)?CLIP\s*#?\d/i.test(clip);
    });

  // If that didn't find clips, try the numbered "1." pattern as fallback
  if (clips.length === 0) {
    clips = clipsText.split(/(?=^\d+\.\s)/m)
      .map(clip => clip.trim())
      .filter(clip => clip.length > 0 && /^\d+\.\s/.test(clip));
  }

  return clips;
}

/**
 * Parse social posts text into array of individual posts
 * Splits on "POST N" pattern, uses index for matching (not labels)
 * @param {string} postsText - Raw posts text from LLM
 * @returns {string[]} Array of individual post contents
 */
function parsePosts(postsText) {
  if (!postsText) return [];

  // Split on "POST N" pattern (case insensitive)
  const posts = postsText.split(/(?=POST\s*\d)/i);

  // Clean up and remove the "POST N (for Clip N):" header from each
  return posts
    .map(post => post.replace(/^POST\s*\d+\s*\([^)]*\)\s*:?\s*/i, '').trim())
    .filter(post => post.length > 0);
}

/**
 * Parse CTAs text into array of individual CTAs
 * Splits on "CTA N" pattern, uses index for matching (not labels)
 * @param {string} ctasText - Raw CTAs text from LLM
 * @returns {string[]} Array of individual CTA contents
 */
function parseCTAs(ctasText) {
  if (!ctasText) return [];

  // Split on "CTA N" pattern (case insensitive)
  const ctas = ctasText.split(/(?=CTA\s*\d)/i);

  // Clean up and remove the "CTA N (for Clip N):" header from each
  return ctas
    .map(cta => cta.replace(/^CTA\s*\d+\s*\([^)]*\)\s*:?\s*/i, '').trim())
    .filter(cta => cta.length > 0);
}

// ===========================================
// DOCUMENT CREATION
// ===========================================

function createMasterDoc(folder, showNotes, metadata) {
  const doc = DocumentApp.create('MASTER - ' + metadata.guestName);
  const body = doc.getBody();

  body.appendParagraph(metadata.guestName + ' - Show Notes')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  body.appendParagraph('Show: ' + metadata.showType);
  body.appendParagraph('Generated: ' + new Date().toISOString());
  body.appendHorizontalRule();

  body.appendParagraph('KEYWORDS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.keywords);

  body.appendParagraph('INTRO')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.intro);

  body.appendParagraph('TIMESTAMPS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const tsPara = body.appendParagraph(showNotes.timestamps);
  const tsText = tsPara.editAsText();

  // Set entire section to 9pt
  tsText.setFontSize(9);

  // Bold timestamp values (00:00 or 00:00:00 at line starts)
  const tsString = tsText.getText();
  const tsPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)/gm;
  let match;

  while ((match = tsPattern.exec(tsString)) !== null) {
    tsText.setBold(match.index, match.index + match[1].length - 1, true);
  }

  body.appendParagraph('KEY INSIGHTS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const kiPara = body.appendParagraph(showNotes.keyInsights);
  const kiText = kiPara.editAsText();

  // Set entire section to 9pt
  kiText.setFontSize(9);

  // Convert **bold** to actual bold formatting
  const kiString = kiText.getText();
  const boldPattern = /\*\*(.+?)\*\*/g;
  const replacements = [];

  while ((match = boldPattern.exec(kiString)) !== null) {
    replacements.push({
      start: match.index,
      end: match.index + match[0].length - 1
    });
  }

  // Process in reverse order to maintain offsets
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];

    // Apply bold to content (excluding the **)
    kiText.setBold(r.start + 2, r.end - 2, true);

    // Remove ** markers
    kiText.deleteText(r.end - 1, r.end);       // Remove trailing **
    kiText.deleteText(r.start, r.start + 1);   // Remove leading **
  }

  body.appendParagraph('EPISODE TITLES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.titles);

  body.appendParagraph('HASHTAGS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(showNotes.hashtags);

  // Parse content into arrays for grouped output
  const clips = parseClips(showNotes.clips);
  const posts = parsePosts(showNotes.socialPosts);
  const ctas = parseCTAs(showNotes.ctas);

  // Main section heading
  body.appendParagraph('CLIP SUGGESTIONS')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Write each clip grouped with its corresponding post and CTA
  for (let i = 0; i < clips.length; i++) {
    // Extract clip title from content (format: 'CLIP N: "Title"' or '## Clip N: "Title"')
    const clipContent = clips[i];
    const titleMatch = clipContent.match(/^(?:##?\s*)?CLIP\s*#?\d+\s*:\s*"?([^"\n]+)"?/i);
    const clipTitle = titleMatch ? titleMatch[1].replace(/"/g, '').trim() : '';

    // Create heading with clip number and title
    const headingText = clipTitle ? 'Clip #' + (i + 1) + ': ' + clipTitle : 'Clip #' + (i + 1);
    body.appendParagraph(headingText)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    // Remove the "CLIP N: Title" line from content since it's now in the heading
    const cleanedContent = clipContent.replace(/^(?:##?\s*)?CLIP\s*#?\d+\s*:\s*"?[^"\n]*"?\s*\n?/i, '').trim();
    body.appendParagraph(cleanedContent);

    // Corresponding social media post (matched by index)
    if (posts[i]) {
      body.appendParagraph('Social Media Post')
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(posts[i]);
    }

    // Corresponding call to action (matched by index)
    if (ctas[i]) {
      body.appendParagraph('Call to Action')
        .setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(ctas[i]);
    }

    // Add separator between clip groups (except after the last one)
    if (i < clips.length - 1) {
      body.appendHorizontalRule();
    }
  }

  // Add links section if present
  if (showNotes.links) {
    addLinksSection(body, showNotes.links);
  }

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);

  return doc;
}

/**
 * Add formatted links section to document body
 * @param {object} body - Document body element
 * @param {string} linksJson - JSON string with links and books
 */
function addLinksSection(body, linksJson) {
  let data;
  try {
    data = JSON.parse(linksJson);
  } catch (error) {
    Logger.log('Failed to parse links for display');
    return;
  }

  // Skip if no content
  if (data.links.length === 0 && data.books.length === 0) {
    return;
  }

  // Main heading
  body.appendParagraph('LINKS & RESOURCES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Links section
  if (data.links.length > 0) {
    body.appendParagraph('Websites & Articles')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    data.links.forEach(item => {
      const para = body.appendParagraph('');
      const text = para.editAsText();

      text.appendText('• ');
      const start = text.getText().length;
      text.appendText(item.title);
      const end = text.getText().length - 1;

      // Add https:// if missing
      const url = item.url.startsWith('http') ? item.url : 'https://' + item.url;
      text.setLinkUrl(start, end, url);
      text.setBold(start, end, true);

      text.setFontSize(9);
      para.setSpacingAfter(3);
    });

    body.appendParagraph('').setSpacingAfter(8);
  }

  // Books section
  if (data.books.length > 0) {
    body.appendParagraph('Books')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);

    data.books.forEach(item => {
      const para = body.appendParagraph('');
      const text = para.editAsText();

      text.appendText('• "');
      const titleStart = text.getText().length;
      text.appendText(item.title);
      const titleEnd = text.getText().length - 1;
      text.setItalic(titleStart, titleEnd, true);

      text.appendText('" by ' + (item.author || 'Unknown Author'));

      text.setFontSize(9);
      para.setSpacingAfter(3);
    });
  }
}

/**
 * Helper for formatting links in standalone document
 * @param {string} linksJson - JSON string with links and books
 * @returns {string} Formatted text for standalone document
 */
function formatLinksForStandalone(linksJson) {
  const data = JSON.parse(linksJson);
  let text = '';

  if (data.links.length > 0) {
    text += 'WEBSITES & ARTICLES\n\n';
    data.links.forEach(item => {
      text += `• ${item.title}\n  ${item.url}\n\n`;
    });
  }

  if (data.books.length > 0) {
    text += 'BOOKS\n\n';
    data.books.forEach(item => {
      text += `• "${item.title}" by ${item.author || 'Unknown Author'}\n\n`;
    });
  }

  return text;
}

// ===========================================
// OPENROUTER API
// ===========================================

function callOpenRouter(prompt, maxTokens) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const payload = {
    model: CONFIG.MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.OPENROUTER_API_KEY,
      'HTTP-Referer': CONFIG.SITE_URL,
      'X-Title': CONFIG.SITE_NAME
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) {
    throw new Error('OpenRouter API error: ' + json.error.message);
  }
  
  return json.choices[0].message.content;
}

// ===========================================
// IMAGE GENERATION (STEWART SQUARED ONLY)
// ===========================================

function generateImagePrompt(transcript, metadata, showNotes) {
  // Use keywords and main topics from the episode to create a dynamic prompt
  const topics = showNotes.keywords.substring(0, 200); // First 200 chars of keywords

  const prompt = `Stewart Squared podcast episode artwork. Modern, vibrant tech-themed abstract illustration featuring themes of ${topics}. Colorful, bold, AI/technology aesthetic with futuristic elements. Professional podcast thumbnail design with dynamic composition. Eye-catching, high-contrast colors. No text or words in the image.`;

  return prompt;
}

function callOpenRouterImageAPI(prompt) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const payload = {
    model: CONFIG.IMAGE_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    modalities: ['image']
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.OPENROUTER_API_KEY,
      'HTTP-Referer': CONFIG.SITE_URL,
      'X-Title': CONFIG.SITE_NAME
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error('OpenRouter Image API error: ' + json.error.message);
  }

  // Log the full response to debug
  Logger.log('Image API Response: ' + JSON.stringify(json).substring(0, 500));

  // Extract base64 image data from response
  if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.images) {
    const image = json.choices[0].message.images[0];
    // The structure is: image.image_url.url (not just image.url)
    const imageUrl = image.image_url ? image.image_url.url : image.url;
    if (!imageUrl) {
      throw new Error('Image URL is undefined in API response');
    }
    return imageUrl;
  }

  throw new Error('No image data in API response. Response: ' + JSON.stringify(json).substring(0, 200));
}

function saveImageToDrive(base64DataUrl, folder, filename) {
  if (!base64DataUrl) {
    throw new Error('base64DataUrl is null or undefined');
  }

  Logger.log('base64DataUrl format: ' + base64DataUrl.substring(0, 50) + '...');

  // Extract base64 data from data URL (format: data:image/png;base64,XXXXX)
  if (!base64DataUrl.includes(',')) {
    throw new Error('Invalid base64DataUrl format - no comma found. Value: ' + base64DataUrl.substring(0, 100));
  }

  const base64Data = base64DataUrl.split(',')[1];

  if (!base64Data) {
    throw new Error('base64Data is empty after split');
  }

  // Decode base64 to blob
  const decodedData = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedData, 'image/png', filename);

  // Create file in folder
  const file = folder.createFile(blob);
  Logger.log('Image saved: ' + filename + ' (' + Math.round(blob.getBytes().length / 1024) + ' KB)');

  return file;
}

function generateEpisodeArtwork(transcript, metadata, showNotes, folder) {
  if (!CONFIG.GENERATE_IMAGES) {
    Logger.log('Image generation disabled in CONFIG');
    return null;
  }

  if (metadata.showType !== 'stewart-squared') {
    Logger.log('Skipping image generation (not Stewart Squared episode)');
    return null;
  }

  try {
    Logger.log('Generating episode artwork for Stewart Squared...');
    const imagePrompt = generateImagePrompt(transcript, metadata, showNotes);
    Logger.log('Image prompt: ' + imagePrompt);

    const base64DataUrl = callOpenRouterImageAPI(imagePrompt);
    const imageFile = saveImageToDrive(base64DataUrl, folder, 'episode-artwork.png');

    Logger.log('Episode artwork generated successfully');
    return imageFile;
  } catch (error) {
    Logger.log('Error generating artwork: ' + error.message);
    sendErrorEmail('Image generation for ' + metadata.guestName, error);
    // Don't throw - just log and continue without image
    return null;
  }
}

// ===========================================
// ERROR NOTIFICATIONS
// ===========================================

function sendErrorEmail(context, error) {
  try {
    MailApp.sendEmail(
      'stewartalsopIII@gmail.com',
      'Maria Automation FAILED: ' + context,
      'Something went wrong processing: ' + context + '\n\n' +
      'Error: ' + error.message + '\n\n' +
      'Stack: ' + (error.stack || 'N/A') + '\n\n' +
      'Time: ' + new Date().toISOString()
    );
  } catch (emailError) {
    Logger.log('Could not send error email: ' + emailError.message);
  }
}

// ===========================================
// SETUP & TRIGGERS
// ===========================================

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  ScriptApp.newTrigger('processNewTranscripts')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Trigger created: processNewTranscripts will run every 5 minutes');
}

function testWithSampleTranscript() {
  processNewTranscripts();
}
