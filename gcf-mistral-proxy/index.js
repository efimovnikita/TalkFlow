const functions = require('@google-cloud/functions-framework');
const WebSocket = require('ws');
const { URL } = require('url');

// Create a WebSocket server instance that is not bound to a specific port
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
  // Parse parameters from the client connection URL
  // e.g. wss://<gcf-url>/?model=voxtral-mini-transcribe-realtime-2602&api_key=mistral_api_key
  const urlParams = new URL(req.url, 'http://localhost');
  const model = urlParams.searchParams.get('model') || 'voxtral-mini-transcribe-realtime-2602';
  
  // Retrieve API Key: prefer the client-supplied key (since users input their own keys in TalkFlow settings),
  // but fallback to the GCF environment variable if configured.
  const clientApiKey = urlParams.searchParams.get('api_key');
  const envApiKey = process.env.MISTRAL_API_KEY;
  const apiKey = clientApiKey || envApiKey;

  if (!apiKey) {
    console.error('Mistral API Key is missing. Neither provided in query parameters (?api_key=) nor MISTRAL_API_KEY environment variable.');
    ws.close(1011, 'Mistral API Key is missing');
    return;
  }

  // Construct target Mistral Realtime WebSocket URL
  const targetUrl = `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=${encodeURIComponent(model)}`;
  console.log(`Connecting to Mistral Realtime API at ${targetUrl.split('?')[0]} with model ${model}`);

  // Initiate connection to Mistral with the required Authorization header
  const mistralWs = new WebSocket(targetUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  const clientQueue = [];
  let isMistralReady = false;

  // Bidirectional forwarding of messages:
  
  // 1. From client to Mistral AI (queued if connection is not ready yet)
  ws.on('message', (message, isBinary) => {
    if (isMistralReady) {
      mistralWs.send(message, { binary: isBinary });
    } else {
      console.log('Mistral connection is not ready. Queueing client message.');
      clientQueue.push({ data: message, isBinary });
    }
  });

  // 2. From Mistral AI to client
  mistralWs.on('message', (message, isBinary) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message, { binary: isBinary });
    }
  });

  // Error and lifecycle handling
  mistralWs.on('open', () => {
    console.log('Successfully connected to Mistral Realtime API');
    isMistralReady = true;
    
    // Flush the queue of early client messages
    if (clientQueue.length > 0) {
      console.log(`Flushing ${clientQueue.length} queued client messages to Mistral`);
      clientQueue.forEach(msg => {
        if (mistralWs.readyState === WebSocket.OPEN) {
          mistralWs.send(msg.data, { binary: msg.isBinary });
        }
      });
      clientQueue.length = 0;
    }
  });

  mistralWs.on('error', (err) => {
    console.error('Mistral WebSocket Error:', err.message || err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        error: { message: `Mistral connection error: ${err.message || 'Unknown'}` } 
      }));
    }
  });

  mistralWs.on('close', (code, reason) => {
    console.log(`Mistral WebSocket closed with code ${code}. Reason: ${reason.toString() || 'None'}`);
    isMistralReady = false;
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(code, reason);
    }
  });

  ws.on('error', (err) => {
    console.error('Client WebSocket Error:', err.message || err);
    if (mistralWs.readyState === WebSocket.OPEN) {
      mistralWs.close();
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Client WebSocket closed with code ${code}. Reason: ${reason.toString() || 'None'}`);
    if (mistralWs.readyState === WebSocket.OPEN) {
      mistralWs.close(code, reason);
    }
  });
});

// Register the HTTP Cloud Function
functions.http('mistralProxy', (req, res) => {
  // WebSocket handshake requests contain an upgrade header
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    // In GCF 2nd Gen, req.socket gives access to the underlying net.Socket
    const socket = req.socket;
    
    // Manually handle the HTTP upgrade to WebSocket
    wss.handleUpgrade(req, socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws, req);
    });
    
    // Do not send HTTP response, as the socket was upgraded to WebSocket
    return;
  }
  
  // Set up standard CORS headers for fallback/healthcheck requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Healthcheck endpoint
  res.status(200).send({
    status: 'online',
    message: 'Mistral Realtime Proxy is running. Connect via WebSocket (ws:// or wss://) to proxy speech transcriptions.'
  });
});
