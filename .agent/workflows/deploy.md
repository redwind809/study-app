---
description: Deploy the app to Firebase Hosting
---
This workflow updates the application version and deploys it to Firebase Hosting without pushing to GitHub.

1. Increase the version number in `assets/script.js` (e.g., `const APP_VERSION = "v4.5";` -> `v4.6`).
2. Run the deployment command:
```bash
cmd /c firebase deploy
```
