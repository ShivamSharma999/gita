@echo off
cls
color 01
echo ## Sanatan AI Gita Builder ##
cmd /c npm run build:ts
node ./scripts/fix-js-imports.js
node ./scripts/copy-static.cjs
set TAURI_SIGNING_PRIVATE_KEY="./src-tauri/target/private.key"
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD="shivam$@tauri"
git tag -a 1.0.2 -m "Release version 1.0.2"
set /p buildOrDev=Do you want to build the app or run the dev script? (build/dev/none):
if "%buildOrDev%"=="build" (
    echo Building the app...
    npm run tauri build
    exit 0
) else if "%buildOrDev%"=="dev" (
    echo Running the dev script...
    npm run tauri dev
    exit 0
) else if "%buildOrDev%"=="none" (
    echo Skipping build and dev scripts.
    exit 0
 ) else (
    echo Invalid option.
    echo running the app by default...
    npm run tauri dev
    exit 0
)