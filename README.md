# Affiliate Skills Landing Page

Landing page ban hang/gioi thieu cho bo [Affiliate Skills](https://github.com/Affitor/affiliate-skills).

## Cau truc

- `index.html`: Toan bo giao dien va CSS cua landing page.
- `vercel.json`: Cau hinh deploy static len Vercel.
- `netlify.toml`: Cau hinh deploy static len Netlify.
- `.nojekyll`: Ho tro GitHub Pages publish file static truc tiep.
- `robots.txt`: Cho phep cong cu tim kiem crawl trang.

## Chay local

Mo truc tiep file `index.html` bang trinh duyet.

Neu muon chay qua local server:

```powershell
python -m http.server 8080
```

Sau do mo:

```text
http://localhost:8080
```

## Deploy len Vercel

1. Tao project moi tren Vercel.
2. Upload folder nay hoac ket noi voi GitHub repo.
3. Framework preset: `Other`.
4. Build command: de trong.
5. Output directory: `.`.

## Deploy len Netlify

1. Tao site moi tren Netlify.
2. Upload folder nay hoac ket noi voi GitHub repo.
3. Build command: de trong.
4. Publish directory: `.`.

## Deploy len GitHub Pages

1. Dua cac file trong folder nay len mot GitHub repository.
2. Vao `Settings` -> `Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main`, folder: `/root`.

## Tuy bien truoc khi publish

- Doi cac CTA `https://github.com/Affitor/affiliate-skills` thanh link affiliate/san pham thuc te neu can.
- Giu disclosure affiliate o dau trang neu co link hoa hong.
- Cap nhat title/meta description neu doi san pham hoac niche.
