
const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Essential for Cloud Run to correctly identify protocol (HTTPS)
app.enable('trust proxy');

// PeerJS Server Configuration
// Using a specific path '/bizsim' avoids root path ambiguity with Express mounting
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/bizsim',
  allow_discovery: true,
  proxied: true // Helpful for load balancers
});

// Mount PeerJS server at /peerjs
// Full URL will be: https://domain/peerjs/bizsim
app.use('/peerjs', peerServer);

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
    // This allows Cloud Run environment variables to reach the browser
    const apiKey = process.env.API_KEY || '';
    const result = data.replace('__API_KEY_PLACEHOLDER__', apiKey);
    
    res.send(result);
  });
});

// Google Cloud Run sets the PORT environment variable
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`PeerJS server running at /peerjs/bizsim`);
  console.log(`API Key configured: ${process.env.API_KEY ? 'Yes' : 'No'}`);
});
