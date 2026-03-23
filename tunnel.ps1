# ==========================================
# CARIDE TUNNEL AUTOMATOR (PowerShell) - DUAL TUNNEL
# ==========================================

# 1. SOZLAMALAR (O'zingizga moslang)
$REMOTE_USER = "root"
$REMOTE_HOST = "45.138.158.199"

$FRONTEND_PORT = 5173              # Lokal frontend porti (masalan Vite/React porti)
$FRONTEND_FORWARD_PORT = 8081      # Serverda frontend uchun ochiladigan port

$BACKEND_PORT = 8000               # Lokal backend porti (masalan FastAPI/Django porti)
$BACKEND_FORWARD_PORT = 8080       # Serverda backend uchun ochiladigan port

$RETRY_DELAY = 5                   # Ulanish uzilsa, necha soniyadan keyin qayta urinish

Write-Host "`n[+] SSH Dual Tunnelni sozlash boshlandi..." -ForegroundColor Cyan

# 2. LOKAL SSH JARAYONLARINI TOZALASH
# Agar avvalgi urinishlardan qolib ketgan SSH bo'lsa, o'chiramiz
$localSsh = Get-Process -Name "ssh" -ErrorAction SilentlyContinue
if ($localSsh) {
    Write-Host "[!] Lokal SSH jarayonlari topildi. Tozalanmoqda..." -ForegroundColor Yellow
    Stop-Process -Name "ssh" -Force -ErrorAction SilentlyContinue
}

# 3. SERVERDAGI BAND PORTLARNI MAJBURIY BO'SHATISH
# Bu qadam "remote port forwarding failed" xatosini tubdan yo'qotadi
Write-Host "[!] Serverdagi ($FRONTEND_FORWARD_PORT va $BACKEND_FORWARD_PORT) portlari tekshirilmoqda va tozalanmoqda..." -ForegroundColor Yellow
$killCmd = "lsof -t -i:$FRONTEND_FORWARD_PORT | xargs kill -9 2>/dev/null || true; lsof -t -i:$BACKEND_FORWARD_PORT | xargs kill -9 2>/dev/null || true; fuser -k ${FRONTEND_FORWARD_PORT}/tcp 2>/dev/null || true; fuser -k ${BACKEND_FORWARD_PORT}/tcp 2>/dev/null || true"
ssh "${REMOTE_USER}@${REMOTE_HOST}" $killCmd 2>$null
Start-Sleep -Seconds 2

# 4. TUNNELNI CHEKSIZ TSIKLDA ISHGA TUSHIRISH (Auto-Reconnect)
Write-Host "`n[OK] Tunnellar ulanmoqda:" -ForegroundColor Green
Write-Host "  -> Frontend: localhost:${FRONTEND_PORT} <---> ${REMOTE_HOST}:${FRONTEND_FORWARD_PORT}" -ForegroundColor Magenta
Write-Host "  -> Backend : localhost:${BACKEND_PORT} <---> ${REMOTE_HOST}:${BACKEND_FORWARD_PORT}" -ForegroundColor Yellow
Write-Host "`n[i] To'xtatish uchun terminalni yoping yoki Ctrl+C bosing.`n" -ForegroundColor Gray

while($true) {
    try {
        # SSH ulanishi (ServerAlive opsiyalari ulanishni "tirik" saqlaydi)
        # -R yordamida ikkita portni 1 ta ulanish ustida serverga yo'naltiramiz
        ssh -o "ServerAliveInterval 30" `
            -o "ServerAliveCountMax 3" `
            -o "ExitOnForwardFailure=yes" `
            -R "${FRONTEND_FORWARD_PORT}:127.0.0.1:${FRONTEND_PORT}" `
            -R "${BACKEND_FORWARD_PORT}:127.0.0.1:${BACKEND_PORT}" `
            "${REMOTE_USER}@${REMOTE_HOST}" -N

    } catch {
        Write-Host "[X] Ulanishda kutilmagan xato!" -ForegroundColor Red
    }

    # Agar SSH uzilsa yoki xato bilan yopilsa
    Write-Host "[!] Ulanish uzildi! $RETRY_DELAY soniyadan so'ng qayta ulanishga uriniladi..." -ForegroundColor Red
    Start-Sleep -Seconds $RETRY_DELAY
    
    # Qayta ulanishdan oldin serverni yana bir bor tozalab yuboramiz
    ssh "${REMOTE_USER}@${REMOTE_HOST}" $killCmd 2>$null
    Start-Sleep -Seconds 2
}