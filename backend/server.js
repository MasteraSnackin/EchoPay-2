const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001; // Choose a port different from the frontend dev server

// Middleware
app.use(cors()); // Enable CORS for requests from the frontend
app.use(express.json()); // Parse JSON request bodies

// Mock API endpoint
app.post('/api/process-command', (req, res) => {
  const commandData = req.body;
  console.log('Received command data:', commandData);

  // Simulate processing
  const responseMessage = `Mock transaction processed for '${commandData?.command || 'unknown command'}'`;

  res.json({
    status: 'success',
    message: responseMessage,
  });
});

app.listen(port, () => {
  console.log(`Mock backend server listening at http://localhost:${port}`);
});
