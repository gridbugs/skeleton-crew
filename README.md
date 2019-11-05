# Skeleton Crew

You awake from cryosleep deep in space. The ship's computer informs you that it woke you as the rest of the crew had mysteriously died. But what's that sound from outside your room?

## Building/Running

Install dependencies:
```
npm install
```

Build:
```
npx webpack
```

This creates the file dist/bundle.js.
Play in a browser by running a static web server from the top level directory.
E.g.
```
python -m http.server  # and navigate to 0.0.0.0:8000 in your browser
```

## Bundle for itch.io

Create a zip suitable for uploading to itch.io with:
```
zip bundle.zip index.html lib/*.js dist/bundle.js images/* fonts/*
```
