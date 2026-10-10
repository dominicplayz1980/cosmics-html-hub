# Cosmics HTML Hub

A small website with:
- A public page where anyone can browse and download uploaded HTML files
- An owner-only panel at `/admin`
- Password-protected upload and delete controls
- HTML files forced to download instead of being executed on the hub's own domain

## Important: it must be hosted to share files

Opening `index.html` locally will not run the server or make uploads available to other people. Deploy this whole Node.js project to a host that supports persistent disk storage, or configure persistent storage for both `uploads/` and `data/files.json`.

## Run on your own computer

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Install dependencies: `npm install`
4. The app now starts with owner password `domthegoat` by default. You can set environment variables to override it.

PowerShell example:
```powershell
$env:ADMIN_PASSWORD = "use-a-long-unique-password-here"
$env:SESSION_SECRET = "put-a-long-random-secret-here"
$env:NODE_ENV = "development"
npm start
```

Then open `http://localhost:3000` for the public page and `http://localhost:3000/admin` for owner login.

## Publish it online

1. Create a new web service on a Node.js-compatible host.
2. Upload/push this project folder.
3. Set the start command to `npm start`.
4. The default owner password is `domthegoat`. Set `ADMIN_PASSWORD` to a stronger unique password before making the site public.
5. Set `SESSION_SECRET` to a long random secret.
6. Use a host with persistent disk storage. If its filesystem resets on deploy, uploaded files and the file list can disappear.
7. Use HTTPS in production.

Do not put the admin password in any HTML or JavaScript file. It belongs only in the server environment variables.

## Uploading

Visit `/admin`, sign in, and choose an `.html` or `.htm` file up to 10 MB. It will appear on the public home page. Visitors can download it without signing in. The owner can delete it from the owner panel.

## Safety notes

HTML files can contain scripts, fake sign-in pages, or other harmful content when opened. This app serves uploads as downloads rather than rendering them on the same site, but that does not make the downloaded files inherently safe. Only publish files you trust. This starter project does not include malware scanning, email verification, or password reset.
