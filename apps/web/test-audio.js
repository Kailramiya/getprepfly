const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.question.findFirst({ where: { audioUrl: { not: null } } })
  .then(q => {
    if (!q) return console.log('No audio');
    const url = q.audioUrl;
    console.log('Fetching', url);
    return fetch('http://localhost:3000/api/media-proxy?url=' + encodeURIComponent(url), { headers: { 'Range': 'bytes=0-10' } })
      .then(r => r.text().then(text => console.log('Status:', r.status, 'Headers:', [...r.headers.entries()], 'Body Length:', text.length)));
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
