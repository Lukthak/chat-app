#!/usr/bin/env bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm rebuild sqlite3
