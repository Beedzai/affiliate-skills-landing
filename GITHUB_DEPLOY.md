# Deploy len GitHub Pages

Bo source nay da san sang cho GitHub Pages.

## Cach nhanh nhat tren GitHub web

1. Tao repository moi tren GitHub, vi du `affiliate-skills-landing`.
2. Chon public repository neu muon dung GitHub Pages mien phi.
3. Upload cac file/folder trong thu muc nay len repo:
   - `index.html`
   - `404.html`
   - `README.md`
   - `robots.txt`
   - `.nojekyll`
   - `.gitignore`
   - `.github/`
4. Vao `Settings` -> `Pages`.
5. Tai `Build and deployment`, chon `GitHub Actions`.
6. Vao tab `Actions`, chay workflow `Deploy static site to GitHub Pages` neu workflow chua tu chay.

Sau khi deploy xong, URL thuong co dang:

```text
https://<username>.github.io/<repository-name>/
```

## File da cau hinh san

- `.github/workflows/pages.yml`: deploy static site len GitHub Pages.
- `.github/dependabot.yml`: cap nhat GitHub Actions hang thang.
- `.nojekyll`: tranh GitHub Pages xu ly bang Jekyll.
- `404.html`: trang loi cho GitHub Pages.
- `robots.txt`: cho phep crawl trang.

## Dong bo Vercel

Repo da co GitHub webhook `push` tro toi Vercel endpoint `/api/github-sync`.
Moi lan co commit moi tren branch `main`, endpoint nay se tao Vercel production deployment moi tu noi dung GitHub hien tai.
