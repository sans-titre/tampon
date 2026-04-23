#!/bin/bash
# Post-install : configure chrome-sandbox avec le bit setuid root
# Nécessaire pour le sandbox Chromium/Electron sur Linux (Ubuntu 24.04+)
# Équivalent à ce que font VS Code, Slack, Discord à l'installation.

SANDBOX="/opt/Tampon/chrome-sandbox"

if [ -f "$SANDBOX" ]; then
  chown root "$SANDBOX"
  chmod 4755 "$SANDBOX"
  echo "Tampon : sandbox Chromium configuré ($SANDBOX)"
fi
