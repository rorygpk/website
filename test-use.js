const express = require('express');
const app = express();
app.use('/v1', (req, res) => {
    res.json({ url: req.url, originalUrl: req.originalUrl });
});
app.listen(3001, () => console.log('started'));
