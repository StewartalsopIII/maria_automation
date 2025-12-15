# Maria Automation - Setup Instructions

## Security Setup (IMPORTANT - Do This First!)

### 1. Get a New OpenRouter API Key
Your previous API key was exposed publicly on GitHub. You need to rotate it:

1. Go to https://openrouter.ai/keys
2. **Revoke/delete your old key:** `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`
3. Create a new API key
4. Copy the new key (you'll need it in the next step)

### 2. Store API Key Securely in Google Apps Script

1. Open your Google Apps Script project: https://script.google.com/home/projects/1aIE83HRFFbOj1TbsHB50Z2HzBSLHG1QaVZXTeFBRw-KF68hrbFXe1GC2/edit
2. Open `Code.gs`
3. Find the `setupAPIKey()` function
4. Replace `'PASTE_YOUR_NEW_API_KEY_HERE'` with your new API key
5. Run the `setupAPIKey` function once:
   - Select `setupAPIKey` from the function dropdown
   - Click the Run button (▶️)
   - Check the logs to confirm: "API key stored securely in Script Properties"
6. After running once, delete or comment out the entire `setupAPIKey()` function
7. Save the script

### 3. Deploy the Updated Code

From your local terminal:
```bash
cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/prototypes-2025/maria_automation
clasp push
```

This will upload the updated code to Google Apps Script (now without the API key hardcoded).

## What Changed

### Security Improvements
- ✅ API key no longer hardcoded in source code
- ✅ API key stored in Google Apps Script Properties Service (encrypted)
- ✅ `.gitignore` added to prevent future secret leaks
- ✅ Git history will be cleaned (next step)

### New Features Added
- ✅ Image generation support for Stewart Squared episodes
- ✅ YouTube show notes format (5,000 character limit)
- ✅ Separate output documents for different platforms

## Git History Cleanup (Do This After Setup)

After you've secured your new API key, run these commands to remove the old key from git history:

```bash
cd /Users/stewartalsop/Dropbox/Crazy\ Wisdom/Business/Coding_Projects/prototypes-2025/maria_automation

# Remove the old key from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch gas_project/Code.gs" \
  --prune-empty --tag-name-filter cat -- --all

# Add the updated file (without API key)
git add gas_project/Code.gs .gitignore SETUP.md

# Commit the secure version
git commit -m "Security: Remove API key, use Properties Service"

# Force push to overwrite GitHub history
git push origin main --force
```

## Folder Structure

```
maria_automation/
├── .gitignore              (prevents secrets from being committed)
├── SETUP.md                (this file)
├── gas_project/
│   ├── Code.gs            (main script - NO API KEYS)
│   └── appsscript.json
├── Blueprints/            (documentation)
└── src_files/             (walkthrough videos)
```

## Testing

After setup, test the script:
1. Upload a test transcript to the input folder
2. Wait 5 minutes (or run `processNewTranscripts()` manually)
3. Check the output folder for generated documents

## Support

If you encounter issues:
- Check the Google Apps Script logs (View → Logs)
- Verify the API key is stored: `Logger.log(PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'))`
- Ensure all folder IDs are correct in CONFIG
