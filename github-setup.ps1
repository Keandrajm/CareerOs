# CareerOS — GitHub Setup Script
# Run this once from PowerShell inside your CareerOS folder:
#   cd "C:\Users\Keand\OneDrive\Desktop\AI Op\CareerOS"
#   .\github-setup.ps1

param(
    [string]$RepoURL = ""
)

Write-Host "CareerOS GitHub Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# 1. Init git
git init
git config user.email "keandrajm@gmail.com"
git config user.name "Keandra Morris"
git branch -M main

# 2. Stage everything (respects .gitignore — no .env, no .sqlite, no node_modules)
git add -A

# 3. Initial commit
git commit -m "Initial commit: CareerOS MVP

- Backend: Node.js/Express + SQLite on port 3001
- Frontend: React/Vite dashboard on port 5173
- Job scanning: Greenhouse (20 boards), Lever (14), Ashby (15)
- AI drafts via OpenAI gpt-4o-mini
- Scoring: 6-dimension 0-100 scale, Green/Yellow/Red labels
- Discord webhook notifications
- Daily 9AM cron scan
- Deploy: Railway (backend) + Netlify (frontend)"

Write-Host ""
Write-Host "Local git repo created with initial commit." -ForegroundColor Green
Write-Host ""

if ($RepoURL -ne "") {
    git remote add origin $RepoURL
    git push -u origin main
    Write-Host "Pushed to GitHub: $RepoURL" -ForegroundColor Green
} else {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://github.com/new and create a repo named 'careeros'" -ForegroundColor White
    Write-Host "  2. Then run:" -ForegroundColor White
    Write-Host "     git remote add origin https://github.com/keandrajm/careeros.git" -ForegroundColor White
    Write-Host "     git push -u origin main" -ForegroundColor White
}
