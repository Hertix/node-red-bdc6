#!/bin/bash

NODE_PATH="/var/lib/revpi-nodered/.node-red"
DEV_PATH="/home/pi/development/node-red-bdc6"

echo "Copying files to Node-RED directory..."
cp -r $DEV_PATH/nodes/* $NODE_PATH/nodes/
cp $DEV_PATH/package.json $NODE_PATH/

echo "Installing module..."
cd $NODE_PATH
npm install

echo "Restarting Node-RED..."
sudo systemctl restart nodered
