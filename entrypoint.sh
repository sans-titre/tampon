#!/bin/sh
fc-cache -f
exec bun run server.ts
