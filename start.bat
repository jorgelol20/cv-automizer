@echo off
REM Arranque de CV-Automizer (app de escritorio). Verifica Node, dependencias, .env y datos.
REM Sin chcp ni tildes: chcp 65001 rompe la salida si stdout va a pipe/fichero.
cd /d "%~dp0"

REM --- 1. Node.js existe ---
node --version >nul 2>&1
if errorlevel 1 goto :NoNode

REM --- 2. Version minima Node 22.12 (la exige Electron 44) ---
for /f %%v in ('node -v 2^>nul') do set NODE_RAW=%%v
set NODE_RAW=%NODE_RAW:v=%
for /f "tokens=1,2 delims=." %%a in ("%NODE_RAW%") do (
  set NODE_MAJOR=%%a
  set NODE_MINOR=%%b
)
if %NODE_MAJOR% LSS 22 goto :OldNode
if %NODE_MAJOR% EQU 22 if %NODE_MINOR% LSS 12 goto :OldNode
echo Node detectado: %NODE_RAW% (correcto, se requiere v22.12+).
goto :DetectPM

:NoNode
echo No se encontro Node.js en el PATH.
goto :AskInstall

:OldNode
echo Se detecto Node %NODE_RAW%, pero se requiere Node 22.12 o superior.
goto :AskInstall

:AskInstall
set "QUIERO="
set /p QUIERO="Quieres instalar Node.js LTS (22.12+) con winget? (S/N): "
if /i "%QUIERO%"=="S" goto :TryWinget
if /i "%QUIERO%"=="SI" goto :TryWinget
echo Descarga Node.js 22.12 o superior desde https://nodejs.org/ e instalalo, luego reintenta.
pause
exit /b 1

:TryWinget
where winget >nul 2>&1
if errorlevel 1 (
  echo winget no esta disponible en este equipo.
  echo Descarga Node.js 22.12 o superior desde https://nodejs.org/ e instalalo, luego reintenta.
  pause
  exit /b 1
)
echo Instalando Node.js LTS con winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo Fallo la instalacion con winget. Descargalo desde https://nodejs.org/.
  pause
  exit /b 1
)
echo Node.js instalado. Cierra esta ventana, abre una nueva terminal y reintenta.
pause
exit /b 0

:DetectPM
REM --- 3. Gestor de paquetes: solo npm ---
REM OJO: npm es npm.cmd (batch): sin call transfiere el control y no vuelve.
call npm --version >nul 2>&1
if errorlevel 1 (
  echo No se encontro npm en el PATH. Reinstala Node.js.
  pause
  exit /b 1
)

REM --- 4. Dependencias ---
if not exist "node_modules\" (
  echo No se encontro node_modules. Instalando dependencias con npm de forma automatica...
  call npm install
  if errorlevel 1 (
    echo Fallo npm install. Revisa tu conexion y reintenta.
    pause
    exit /b 1
  )
  echo Dependencias instaladas.
)

REM --- 5. Fichero .env ---
if exist ".env" goto :CheckData
if exist ".env.example" (
  copy /y ".env.example" ".env" >nul
  echo Se ha creado .env desde .env.example. Revisa tus claves antes de continuar.
  goto :CheckData
)
echo Aviso: no existe .env ni .env.example. Se continua sin .env.
goto :CheckData

:CheckData
REM --- 6. Datos de entrada: en el primer arranque se copian las plantillas ---
if exist "data\UserInfo.md" goto :CheckOffer
if exist "data\UserInfo.example.md" (
  copy /y "data\UserInfo.example.md" "data\UserInfo.md" >nul
  echo Se ha creado data\UserInfo.md desde la plantilla. Editalo con tus datos.
)
:CheckOffer
if exist "data\oferta.md" goto :CheckPdf
if exist "data\oferta.example.md" (
  copy /y "data\oferta.example.md" "data\oferta.md" >nul
  echo Se ha creado data\oferta.md desde la plantilla. Editala con la oferta.
)
goto :CheckPdf

:CheckPdf
REM --- 7. PDF: el escritorio usa el Chromium integrado de Electron ---
echo PDF: motor integrado de Electron (no hace falta Chrome ni Chromium).
goto :Launch

:Launch
REM --- 8. Arrancar desktop ---
echo Arrancando la app de escritorio...
call npm run desktop
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo Error al ejecutar npm run desktop ^(codigo %EXITCODE%^). Revisa el mensaje anterior.
)
pause
exit /b %EXITCODE%
