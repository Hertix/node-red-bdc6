#!/usr/bin/env bash
set -e
echo "[BDC6] Installing Node-RED module..."
cd /var/lib/revpi-nodered/.node-red
sudo npm install "$HOME/development/node-red-bdc6"
sudo systemctl restart nodered
echo "[BDC6] Done."
