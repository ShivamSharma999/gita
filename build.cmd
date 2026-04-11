@echo off
cls
color 01
echo ## Sanatan AI Gita Builder ##
cmd /c npm run build:ts
node ./scripts/fix-js-imports.js
node ./scripts/copy-static.cjs
set TAURI_SIGNING_PRIVATE_KEY="dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5TElGc3dXbjZTSHYxUmJPdHJGOUtXWmU1eXdXeG5yV1pWSkNuUmJpYmVkd0FBQkFBQUFBQUFBQUFBQUlBQUFBQVpHMXBJam13TGcyM3BHYnFzZWRtTENOQUVjR3pWem5VZzVmMEJselRHSXdQdEhqNjdwUGhXclpjeUUzcm5yQ0RKYjBpeFFoMVZhQ2RoNkV0U0RSRHp2NStHUVF5MTA4QjhmY3RVbHgrcDVEV1R6QmcrbTZJbzE1Qi9Bd21ESTlGRU0zaWJNaytaazA9Cg=="
set TAURI_SIGNING_PRIVATE_KEY_PATH="./tauri/sanatan.key"
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
set /p buildOrDev=Do you want to build the app or run the dev script? (build/dev/none): 
if "%buildOrDev%"=="build" (
    echo Building the app...
    node ./scripts/makeLatest.cjs
    cmd /c npm run tauri build
) else if "%buildOrDev%"=="dev" (
    echo Running the dev script...
    npm run tauri dev
) else if "%buildOrDev%"=="none" (
    echo Skipping build and dev scripts.
 ) else (
    echo Invalid option.
    echo Skipping by default...
)
pause