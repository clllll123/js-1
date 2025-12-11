
const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Essential for Cloud Run
app.enable('trust proxy');

// Serve Static Files (The React App)
// Disable default index serving to allow dynamic injection below
app.use(express.static(path.join(__dirname, 'dist'), { index: false }));

// Handle React Routing (SPA fallback) and inject Env Vars
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Server Error loading application');
    }
    
    // Inject API_KEY from server environment into client HTML
    const apiKey = process.env.API_KEY || '';
    const result = data.replace('__API_KEY_PLACEHOLDER__', apiKey);
    
    res.send(result);
  });
});

// Google Cloud Run sets the PORT environment variable
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Protocol: MQTT over WSS (External Broker)`);
  console.log(`API Key configured: ${process.env.API_KEY ? 'Yes' : 'No'}`);
});
