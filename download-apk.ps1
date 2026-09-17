$ErrorActionPreference = "Stop"

# ============================================================
# Open Grind - APK Build Selector & Downloader
# ============================================================

$Repo = "joteiza003/open-grindr"
$Workflow = "Build Android APK"
$OutputDir = Join-Path $PSScriptRoot "builds"
$FinalApk = Join-Path $OutputDir "OpenGrind.apk"
$TempDir = Join-Path $OutputDir "_download"

$BuildCount = 10

# ------------------------------------------------------------
# Functions
# ------------------------------------------------------------

function Write-Separator {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
}

function Exit-WithError {
    param (
        [string]$Message
    )

    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ------------------------------------------------------------
# Header
# ------------------------------------------------------------

Clear-Host

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          OPEN GRIND - APK BUILD SELECTOR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# Check GitHub CLI
# ------------------------------------------------------------

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {

    Write-Host "GitHub CLI (gh) no esta instalado." -ForegroundColor Red
    Write-Host ""

    Write-Host "Instalalo con:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "winget install --id GitHub.cli"
    Write-Host ""

    exit 1
}

# ------------------------------------------------------------
# Check authentication
# ------------------------------------------------------------

Write-Host "Comprobando autenticacion de GitHub..." -ForegroundColor Gray

gh auth status 2>$null

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "No estas autenticado en GitHub CLI." -ForegroundColor Red
    Write-Host ""

    Write-Host "Ejecuta una vez:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "gh auth login"
    Write-Host ""

    exit 1
}

# ------------------------------------------------------------
# Get recent builds
# ------------------------------------------------------------

Write-Host ""
Write-Host "Buscando los ultimos $BuildCount builds..." -ForegroundColor Gray
Write-Host ""

$RunsJson = gh run list `
    --repo $Repo `
    --workflow $Workflow `
    --limit $BuildCount `
    --json databaseId,status,conclusion,headSha,createdAt,event,displayTitle,url

if ($LASTEXITCODE -ne 0) {
    Exit-WithError "No se pudieron obtener los builds de GitHub."
}

$Runs = $RunsJson | ConvertFrom-Json

if (-not $Runs -or $Runs.Count -eq 0) {
    Exit-WithError "No se encontro ningun build."
}

# ------------------------------------------------------------
# Display builds
# ------------------------------------------------------------

Write-Host "ULTIMOS BUILDS" -ForegroundColor Cyan
Write-Separator

$Index = 1

foreach ($Run in $Runs) {

    $Date = [DateTime]::Parse($Run.createdAt).ToLocalTime().ToString("dd/MM/yyyy HH:mm")

    $ShortSha = $Run.headSha.Substring(0, 7)

    if ($Run.status -ne "completed") {
        $StatusText = "EN CURSO"
        $StatusColor = "Yellow"
    }
    elseif ($Run.conclusion -eq "success") {
        $StatusText = "OK"
        $StatusColor = "Green"
    }
    else {
        $StatusText = $Run.conclusion.ToUpper()
        $StatusColor = "Red"
    }

    Write-Host ""
    Write-Host "[$Index] " -NoNewline -ForegroundColor White
    Write-Host "$Date" -NoNewline -ForegroundColor Cyan
    Write-Host "  " -NoNewline
    Write-Host "$StatusText" -ForegroundColor $StatusColor

    Write-Host "    Commit: " -NoNewline -ForegroundColor DarkGray
    Write-Host $ShortSha

    if ($Run.displayTitle) {
        Write-Host "    Cambio: " -NoNewline -ForegroundColor DarkGray
        Write-Host $Run.displayTitle
    }

    Write-Host "    Evento: " -NoNewline -ForegroundColor DarkGray
    Write-Host $Run.event

    $Index++
}

Write-Separator

# ------------------------------------------------------------
# User selection
# ------------------------------------------------------------

do {

    Write-Host ""
    Write-Host "Selecciona el build que quieres descargar." -ForegroundColor White
    Write-Host ""
    Write-Host "Introduce un numero del 1 al $($Runs.Count), o Q para salir." -ForegroundColor Gray
    Write-Host ""

    $Selection = Read-Host "Build"

    if ($Selection -match "^[Qq]$") {
        Write-Host ""
        Write-Host "Cancelado." -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }

    $ValidSelection = $Selection -match "^\d+$" -and
                      [int]$Selection -ge 1 -and
                      [int]$Selection -le $Runs.Count

    if (-not $ValidSelection) {
        Write-Host ""
        Write-Host "Seleccion no valida." -ForegroundColor Red
    }

} while (-not $ValidSelection)

$SelectedIndex = [int]$Selection - 1
$Run = $Runs[$SelectedIndex]

# ------------------------------------------------------------
# Selected build information
# ------------------------------------------------------------

Write-Host ""
Write-Host "BUILD SELECCIONADO" -ForegroundColor Cyan
Write-Separator

Write-Host "ID:         $($Run.databaseId)"
Write-Host "Commit:     $($Run.headSha)"
Write-Host "Fecha:      $([DateTime]::Parse($Run.createdAt).ToLocalTime().ToString("dd/MM/yyyy HH:mm"))"
Write-Host "Estado:     $($Run.status)"
Write-Host "Conclusion: $($Run.conclusion)"
Write-Host ""

# ------------------------------------------------------------
# If build is still running, wait
# ------------------------------------------------------------

if ($Run.status -ne "completed") {

    Write-Host "Este build todavia esta en curso." -ForegroundColor Yellow
    Write-Host "Esperando a que termine..." -ForegroundColor Yellow
    Write-Host ""

    gh run watch $Run.databaseId `
        --repo $Repo `
        --exit-status

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "El build ha fallado." -ForegroundColor Red
        Write-Host ""

        Write-Host "GitHub Actions:" -ForegroundColor Yellow
        Write-Host $Run.url
        Write-Host ""

        exit 1
    }
}

# ------------------------------------------------------------
# Refresh selected build
# ------------------------------------------------------------

$FinalRunJson = gh run view $Run.databaseId `
    --repo $Repo `
    --json status,conclusion,headSha,url,createdAt `
    --jq '.'

if (-not $FinalRunJson) {
    Exit-WithError "No se pudo consultar el resultado final del build."
}

$FinalRun = $FinalRunJson | ConvertFrom-Json

# ------------------------------------------------------------
# Check build result
# ------------------------------------------------------------

if ($FinalRun.conclusion -ne "success") {

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "                    BUILD FALLIDO" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""

    Write-Host "Conclusion: $($FinalRun.conclusion)" -ForegroundColor Red

    Write-Host ""
    Write-Host "GitHub Actions:" -ForegroundColor Yellow
    Write-Host $FinalRun.url

    Write-Host ""

    exit 1
}

Write-Host ""
Write-Host "Build correcto." -ForegroundColor Green

# ------------------------------------------------------------
# Prepare temporary directory
# ------------------------------------------------------------

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TempDir | Out-Null

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# ------------------------------------------------------------
# Download artifact
# ------------------------------------------------------------

Write-Host ""
Write-Host "Descargando Artifact..." -ForegroundColor Cyan

gh run download $Run.databaseId `
    --repo $Repo `
    --dir $TempDir

if ($LASTEXITCODE -ne 0) {

    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

    Exit-WithError "No se pudo descargar el Artifact."
}

# ------------------------------------------------------------
# Extract ZIP files
# ------------------------------------------------------------

$ZipFiles = Get-ChildItem `
    -Path $TempDir `
    -Filter "*.zip" `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue

foreach ($Zip in $ZipFiles) {

    Write-Host ""
    Write-Host "Extrayendo $($Zip.Name)..." -ForegroundColor Gray

    Expand-Archive `
        -Path $Zip.FullName `
        -DestinationPath $TempDir `
        -Force
}

# ------------------------------------------------------------
# Find APK
# ------------------------------------------------------------

$ApkFiles = Get-ChildItem `
    -Path $TempDir `
    -Filter "*.apk" `
    -File `
    -Recurse `
    -ErrorAction SilentlyContinue

if (-not $ApkFiles) {

    Write-Host ""
    Write-Host "No se encontro ningun APK dentro del Artifact." -ForegroundColor Red
    Write-Host ""

    Write-Host "Contenido descargado:" -ForegroundColor Yellow

    Get-ChildItem `
        -Path $TempDir `
        -Recurse |
        Select-Object FullName

    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

    exit 1
}

# ------------------------------------------------------------
# Select newest APK
# ------------------------------------------------------------

$DownloadedApk = $ApkFiles |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

# ------------------------------------------------------------
# Remove previous OpenGrind.apk
# ------------------------------------------------------------

if (Test-Path $FinalApk) {

    Write-Host ""
    Write-Host "Eliminando APK anterior..." -ForegroundColor Gray

    Remove-Item $FinalApk -Force
}

# ------------------------------------------------------------
# Copy selected APK
# ------------------------------------------------------------

Copy-Item `
    -Path $DownloadedApk.FullName `
    -Destination $FinalApk `
    -Force

# ------------------------------------------------------------
# Clean temporary files
# ------------------------------------------------------------

Remove-Item $TempDir `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# Calculate APK information
# ------------------------------------------------------------

$ApkInfo = Get-Item $FinalApk

$SizeMB = [math]::Round(
    $ApkInfo.Length / 1MB,
    2
)

$Hash = (
    Get-FileHash `
        -Path $FinalApk `
        -Algorithm SHA256
).Hash

# ------------------------------------------------------------
# Final result
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "                 APK DESCARGADO" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Archivo:" -ForegroundColor Cyan
Write-Host $FinalApk

Write-Host ""
Write-Host "Tamano:" -ForegroundColor Cyan
Write-Host "$SizeMB MB"

Write-Host ""
Write-Host "Commit:" -ForegroundColor Cyan
Write-Host $FinalRun.headSha

Write-Host ""
Write-Host "SHA256:" -ForegroundColor Cyan
Write-Host $Hash

Write-Host ""
Write-Host "GitHub Actions:" -ForegroundColor Cyan
Write-Host $FinalRun.url

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""