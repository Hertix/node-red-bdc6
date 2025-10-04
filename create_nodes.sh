# add the script
mkdir -p scripts
$EDITOR scripts/generate_nodes.js   # paste the code above

# generate into ./nodes using your existing CSV
node scripts/generate_nodes.js ./signals.csv ./nodes

# expose nodes in package.json (example)
# {
#   "name": "node-red-bdc6",
#   "version": "0.1.0",
#   "node-red": {
#     "nodes": {
#       "bdc6-bdc6-state-request-<signal>": "nodes/bdc6-bdc6-state-request-<signal>.js",
#       "bdc6-bdc6-ls-value-limits-<signal>": "nodes/bdc6-bdc6-ls-value-limits-<signal>.js",
#       "bdc6-bdc6-hs-value-limits-<signal>": "nodes/bdc6-bdc6-hs-value-limits-<signal>.js"
#     }
#   }
# }

# install locally & restart Node-RED
npm install
