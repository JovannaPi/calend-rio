const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
  })
);

app.listen(PORT, () => {
  console.log(`Calend.rio rodando em http://localhost:${PORT}`);
});
