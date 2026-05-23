#!/usr/bin/env bash

# Bash Script to boot Eon under PM2 process supervision
# Ensure PM2 is installed globally: npm install pm2 -g

set -e

echo -e "\x1b[1;36m=========================================\x1b[0m"
echo -e "\x1b[1;36m  Starting Eon Production HUD via PM2\x1b[0m"
echo -e "\x1b[1;36m=========================================\x1b[0m"

# 1. Run Preflight Theme Validation
echo -e "\n\x1b[1;33m[1/3] Running preflight theme validation...\x1b[0m"
npm run theme:validate

# 2. Check if PM2 is available
echo -e "\n\x1b[1;33m[2/3] Checking PM2 availability...\x1b[0m"
if ! command -v pm2 &> /dev/null; then
    echo -e "\x1b[1;33m[WARNING] PM2 is not installed globally.\x1b[0m"
    echo -e "Please install it via: \x1b[1;36mnpm install -g pm2\x1b[0m"
    echo -e "Starting server directly via Node instead...\x1b[1;33m"
    NODE_ENV=production node .
    exit 0
fi

# 3. Startup PM2 ecosystem config
echo -e "\n\x1b[1;33m[3/3] Starting Eon under process supervision...\x1b[0m"
pm2 start ecosystem.config.cjs --env production

echo -e "\n\x1b[1;32m=========================================\x1b[0m"
echo -e "\x1b[1;32m✔ Eon successfully orchestrated by PM2!\x1b[0m"
echo -e "Useful commands:"
echo -e "  \x1b[1;36mpm2 status\x1b[0m    - Check Eon status"
echo -e "  \x1b[1;36mpm2 logs eon\x1b[0m  - Stream realtime server logs"
echo -e "  \x1b[1;36mpm2 restart eon\x1b[0m - Restart Eon server"
echo -e "  \x1b[1;36mpm2 stop eon\x1b[0m  - Turn off Eon server"
echo -e "\x1b[1;32m=========================================\x1b[0m"
