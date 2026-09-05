#Shafey's 3D Interactive Portfolio

## 🚀 Overview

Welcome to my interactive 3D web portfolio. This project leverages WebGL, optimized 3D models, and custom modular JavaScript to create an immersive, highly engaging user experience. It serves to showcase my skills as a Full-Stack Developer & AI Engineer.

## ✨ Features

- **Interactive 3D Scene:** Utilizes WebGL to render and interact with optimized 3D models (`3d_model.optimized.glb`).
- **Dynamic Scroll Effects:** Features horizontal scrolling and precise scroll-triggered animations (`horizontal-scroll.js`, `scroll-controller.js`).
- **Command Palette:** A built-in command interface for quick navigation and interaction.
- **Audio Integration:** Background ambient music (`Adventure.mp3`) for an immersive experience.
- **Polished UI/UX:** Typewriter text effects, tilt animations, and smooth transitions.
- **SEO Ready:** Fully equipped with `sitemap.xml` and `robots.txt`.

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3
- **Scripting:** Vanilla JavaScript (Modular ES6 architecture)
- **3D Graphics:** WebGL (handling `.glb` 3D assets)

## 💻 Running the Project Locally

Because this project uses JavaScript modules and loads external 3D assets, opening `index.html` directly in the browser via `file://` protocol will cause CORS (Cross-Origin Resource Sharing) errors. You must use a local web server.

### Option 1: Using VS Code (Recommended)

1. Clone this repository.
2. Open the project folder (`Shafeyyy`) in VS Code.
3. Install the **Live Server** extension by Ritwick Dey.
4. Right-click on `index.html` and select **"Open with Live Server"**.

### Option 2: Using Python

If you have Python installed on your system, you can spin up a local server quickly:

```bash
# Open terminal in the project directory and run:
python -m http.server 8000
```

Then, navigate to `http://localhost:8000` in your web browser.

## 📁 Directory Structure

- `/assets/audio/` - Background music and sound effects.
- `/assets/css/` - Stylesheets.
- `/assets/js/` - Modular JavaScript files handling specific functionalities (WebGL, animations, UI controls).
- `/assets/models/` - Optimized 3D assets (`.glb`).
- `index.html` - The main entry point of the application.
- `robots.txt` & `sitemap.xml` - Search engine optimization configurations.

## 👤 Author

**Shafey** - Full-Stack Developer & AI Engineer
