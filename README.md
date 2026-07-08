# Newspaper Photobooth 📰

A browser-based photobooth that turns your webcam snapshot into a bold, red
newspaper "front page" — inspired by the newspaper-style photobooth trend
(like the one at Red Studio in Binondo). Pure HTML/CSS/JS, no build step,
no backend — everything (including the camera feed) stays in the visitor's
own browser.

## Features
- Live webcam preview with a 3-2-1 countdown capture
- Optional black & white "newsprint" filter and mirror toggle
- Editable masthead, headline, tagline, banner text, and volume number
- One-click export of the whole front page as a PNG (via [html2canvas](https://html2canvas.hertzen.com/))
- No dependencies to install — works as a static site

## Running locally
Just open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Most browsers require `http://` or `https://`, not `file://`, for camera
access to work — a local server or GitHub Pages both satisfy this.)

## Deploying to GitHub Pages
1. Push this folder's contents to a repo.
2. In the repo, go to **Settings → Pages**.
3. Set the source branch to `main` (or wherever these files live) and the
   folder to `/root`.
4. Your photobooth will be live at `https://<username>.github.io/<repo>/`.

## File structure
```
.
├── index.html      # page structure
├── style.css       # red newspaper theme, fonts, layout
├── script.js       # camera, capture, filters, PNG export
└── assets/
    ├── thumb-lanterns.svg
    └── thumb-crowd.svg
```

## Customizing
Click **"Customize headline"** on the page to edit the masthead text,
studio name, big headline, tagline, banner, and volume number live —
no code changes needed. To change colors or fonts, edit the CSS custom
properties at the top of `style.css` (`--red`, `--paper`, `--gold`, etc.)
and the Google Fonts `<link>` in `index.html`.

## Privacy
The camera stream and captured photo never leave the visitor's device —
there's no server component, so nothing is uploaded anywhere.
