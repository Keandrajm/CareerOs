# CareerOS GitHub setup helper.
# Keep this script generic: do not hardcode personal names, email addresses, paths, or repo URLs.

param(
    [string]$RepoURL = "",
    [string]$GitUserName = "",
    [string]$GitUserEmail = ""
)

Write-Host "CareerOS GitHub Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

git init

if ($GitUserName -ne "") {
    git config user.name $GitUserName
}

if ($GitUserEmail -ne "") {
    git config user.email $GitUserEmail
}

git branch -M main
git add -A
git commit -m "Initial CareerOS build"

if ($RepoURL -ne "") {
    git remote add origin $RepoURL
    git push -u origin main
    Write-Host "Pushed to GitHub: $RepoURL" -ForegroundColor Green
} else {
    Write-Host "Local git repo created. Add a remote with:" -ForegroundColor Yellow
    Write-Host "git remote add origin <your-repo-url>" -ForegroundColor White
    Write-Host "git push -u origin main" -ForegroundColor White
}
