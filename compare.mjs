import fs from 'fs';

const oldLines = fs.readFileSync('server.ts', 'utf8').split('\n');
const newLines = fs.readFileSync('server_refactored.ts', 'utf8').split('\n');

const countTries = lines => lines.filter(l => l.includes('try {')).length;
const countCatches = lines => lines.filter(l => l.includes('catch (')).length;

console.log('Old:', countTries(oldLines), 'tries,', countCatches(oldLines), 'catches');
console.log('New:', countTries(newLines), 'tries,', countCatches(newLines), 'catches');
