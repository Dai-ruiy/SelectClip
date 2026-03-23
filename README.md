# Video Clipper Demo

Static video clipper UI demo for GitHub Pages.

## Local preview

Open `index.html` directly, or run a simple static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. In this folder, initialize git:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

3. In GitHub, open:
   `Settings` -> `Pages` -> `Source`

4. Set source to `GitHub Actions`.

5. Push to `main` again if needed. The workflow in `.github/workflows/pages.yml` will deploy the site.

After deployment, your site URL will look like:

```text
https://<your-github-username>.github.io/<your-repo-name>/
```
