import { app } from './server';

// commercetools Connect event applications conventionally listen on port 8080 in deployed
// environments, so that's the default here even though it can be overridden locally via PORT.
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(PORT, () => {
  console.log(`Event application listening on port ${PORT}`);
});
