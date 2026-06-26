const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
const originalLines = lines.slice(608); // from line 609 onwards

const newFileContent = `import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

` + originalLines.join('\n');

fs.writeFileSync('server.ts', newFileContent);
console.log('Restored server.ts');
