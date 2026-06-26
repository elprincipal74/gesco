# Script di migrazione per Sistema Ferie a Google Drive
# Questo script sposta il progetto su Google Drive e configura la cartella node_modules locale
# per evitare rallentamenti di sincronizzazione.

$ErrorActionPreference = "Stop"

Write-Host "=== CONFIGURAZIONE SISTEMA FERIE SU GOOGLE DRIVE ===" -ForegroundColor Cyan

# 1. Verifica se Google Drive è montato
$gDrivePath = ""
$possiblePaths = @(
    "G:\Il mio Drive",
    "G:\My Drive",
    "$HOME\Google Drive\Il mio Drive",
    "$HOME\Google Drive\My Drive"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gDrivePath = Join-Path $path "Sistema Ferie"
        break
    }
}

if (-not $gDrivePath) {
    Write-Host ""
    Write-Host "[ERRORE] Google Drive non sembra essere installato o avviato su questo PC." -ForegroundColor Red
    Write-Host "Per favore:" -ForegroundColor Yellow
    Write-Host "1. Scarica e installa 'Google Drive per desktop' da: https://www.google.com/drive/download/" -ForegroundColor Yellow
    Write-Host "2. Effettua l'accesso con il tuo account Google." -ForegroundColor Yellow
    Write-Host "3. Riavvia questo script." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi INVIO per uscire..."
    exit
}

Write-Host "Google Drive rilevato in: $(Split-Path $gDrivePath)" -ForegroundColor Green
Write-Host "Il progetto verrà spostato in: $gDrivePath" -ForegroundColor Green
Write-Host ""

# Chiedi conferma
$title = "Spostamento Progetto"
$message = "Vuoi procedere con lo spostamento del progetto su Google Drive?"
$yes = New-Object System.Management.Automation.Host.ChoiceDescription "&Sì", "Sposta il progetto e configura i collegamenti."
$no = New-Object System.Management.Automation.Host.ChoiceDescription "&No", "Annulla l'operazione."
$options = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $no)
$result = $host.ui.PromptForChoice($title, $message, $options, 0)

if ($result -ne 0) {
    Write-Host "Operazione annullata." -ForegroundColor Yellow
    exit
}

# 2. Rimuovi node_modules locale per velocizzare lo spostamento
$currentPath = Get-Location
$localNodeModules = Join-Path $currentPath "node_modules"
if (Test-Path $localNodeModules) {
    Write-Host "Rimozione di node_modules locale in corso..." -ForegroundColor Gray
    Remove-Item -Path $localNodeModules -Recurse -Force
}

# 3. Crea la cartella locale per le dipendenze esterne a Google Drive
$localDependencyPath = "C:\node_dependencies\gesco"
if (-not (Test-Path $localDependencyPath)) {
    Write-Host "Creazione cartella per dipendenze locali in $localDependencyPath..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $localDependencyPath -Force | Out-Null
}

# 4. Sposta il progetto su Google Drive (esclusi file di sistema temporanei)
Write-Host "Spostamento dei file di progetto su Google Drive..." -ForegroundColor Gray
if (-not (Test-Path $gDrivePath)) {
    New-Item -ItemType Directory -Path $gDrivePath -Force | Out-Null
}

# Sposta tutti i file tranne lo script stesso per evitare conflitti
Get-ChildItem -Path $currentPath | Where-Object { $_.Name -ne "setup_gdrive_sync.ps1" } | ForEach-Object {
    $destination = Join-Path $gDrivePath $_.Name
    if (Test-Path $destination) {
        Remove-Item -Path $destination -Recurse -Force
    }
    Move-Item -Path $_.FullName -Destination $gDrivePath -Force
}

# 5. Crea la Junction (collegamento) per node_modules nella nuova cartella su Google Drive
Write-Host "Configurazione collegamento intelligente per node_modules..." -ForegroundColor Gray
$gDriveNodeModules = Join-Path $gDrivePath "node_modules"
New-Item -ItemType Junction -Path $gDriveNodeModules -Target $localDependencyPath | Out-Null

# 6. Esegui npm install nella nuova cartella
Write-Host "Installazione delle dipendenze (npm install) in corso..." -ForegroundColor Gray
Start-Process -FilePath "npm" -ArgumentList "install" -WorkingDirectory $gDrivePath -NoNewWindow -Wait

Write-Host ""
Write-Host "=== MIGRAZIONE COMPLETATA CON SUCCESSO! ===" -ForegroundColor Green
Write-Host "Il progetto è ora su Google Drive." -ForegroundColor Green
Write-Host "Importante: Apri la nuova cartella ($gDrivePath) nel tuo editor di codice per continuare a lavorare." -ForegroundColor Yellow
Write-Host ""
Read-Host "Premi INVIO per terminare..."
