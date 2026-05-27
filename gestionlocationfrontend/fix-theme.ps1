$file = "src\app\styles\theme.css"
$content = [System.IO.File]::ReadAllText((Resolve-Path $file))

# Replace all red rgba values with blue
$content = $content -replace 'rgba\(201, 24, 43,', 'rgba(30, 64, 175,'

# Replace hex red codes
$content = $content -replace '#c9182b', '#1e40af'
$content = $content -replace '#C9182B', '#1e40af'
$content = $content -replace '#981327', '#1d4ed8'
$content = $content -replace '#74101f', '#1e3a8a'
$content = $content -replace '#e22c42', '#3b82f6'
$content = $content -replace '#E22C42', '#3b82f6'
$content = $content -replace '#d36a77', '#93c5fd'

# Replace admin-primary red
$content = $content -replace '--admin-primary: #1e40af;', '--admin-primary: #1e40af;'
$content = $content -replace '--admin-primary: #c9182b;', '--admin-primary: #1e40af;'
$content = $content -replace '--admin-primary-soft: rgba\(201, 24, 43, 0\.08\)', '--admin-primary-soft: rgba(30, 64, 175, 0.08)'

# Fix alert-primary colors
$content = $content -replace '#5f0f1c', '#1e3a8a'

[System.IO.File]::WriteAllText((Resolve-Path $file), $content)
Write-Host "Done - all red colors replaced with blue"
