import express from 'express';
const app = express();
app.all('/api/test', (req, res) => {
  res.json({ success: true });
});
app.listen(3001, async () => {
  const r = await fetch('http://localhost:3001/api/test?arg=1');
  console.log(await r.json());
  process.exit(0);
});
