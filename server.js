const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const SCRIPT_NAME = 'fc26-playstyle-evo-helper.user.js';
const SCRIPT_PATH = path.join(__dirname, SCRIPT_NAME);
const HTML_PATH = path.join(__dirname, 'index.html');

// Helper to get local network IP addresses
function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1'];
}

// Parses the Userscript block from the script file
function parseUserscript(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Script file not found' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    const lines = content.split(/\r?\n/);
    const metadata = {};
    let inMeta = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '// ==UserScript==') {
        inMeta = true;
        continue;
      }
      if (trimmed === '// ==/UserScript==') {
        inMeta = false;
        break;
      }
      if (inMeta && trimmed.startsWith('//')) {
        // Match: // @key value
        const match = trimmed.match(/^\/\/\s*@(\S+)\s+(.+)$/);
        if (match) {
          const key = match[1];
          const val = match[2].trim();
          if (metadata[key]) {
            if (Array.isArray(metadata[key])) {
              metadata[key].push(val);
            } else {
              metadata[key] = [metadata[key], val];
            }
          } else {
            metadata[key] = val;
          }
        }
      }
    }
    
    return {
      success: true,
      metadata,
      sizeBytes: stats.size,
      lastModified: stats.mtime.toISOString(),
      content: content
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  // API to get script content and metadata
  if (url.pathname === '/api/script') {
    const scriptData = parseUserscript(SCRIPT_PATH);
    const localIps = getLocalIps();
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' 
    });
    res.end(JSON.stringify({
      ...scriptData,
      ips: localIps,
      port: PORT
    }));
    return;
  }
  
  // Serve index.html
  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(HTML_PATH, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }
  
  // Simple fallback for other requests (404)
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log('==================================================');
  console.log('PlayStyle Evo Helper Script Copier Server Running!');
  console.log('--------------------------------------------------');
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log('Mobile/Network Access:');
  ips.forEach(ip => {
    console.log(`  http://${ip}:${PORT}`);
  });
  console.log('==================================================');
});
