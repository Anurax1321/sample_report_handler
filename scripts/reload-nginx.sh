#!/bin/bash
# Reload nginx after config changes (config is symlinked)
set -e

sudo nginx -t && sudo systemctl reload nginx
echo "Nginx reloaded."
