import { Hono } from 'hono';

export const docs = new Hono();

const openapiYaml = `openapi: 3.0.3
info:
  title: VoiceDOT API
  version: 0.1.0
servers:
  - url: /
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200': { description: OK }
  /status/polkadot:
    get:
      summary: Polkadot network status
      responses:
        '200': { description: OK }
  /voice/process:
    post:
      summary: Process voice input
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                audio_data: { type: string }
                user_id: { type: string }
                format: { type: string, enum: [mp3, wav, webm] }
              required: [audio_data, user_id]
      responses:
        '200': { description: Intent and confirmation audio }
  /voice/confirm:
    post:
      summary: Confirm or cancel via voice
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                audio_data: { type: string }
                user_id: { type: string }
                transaction_id: { type: string, format: uuid }
                transaction_ids:
                  type: array
                  items: { type: string, format: uuid }
      responses:
        '200': { description: Confirmation result }
  /transactions:
    get:
      summary: List transactions
      parameters:
        - in: query
          name: user_id
          schema: { type: string }
        - in: query
          name: status
          schema: { type: string }
        - in: query
          name: limit
          schema: { type: integer }
        - in: query
          name: offset
          schema: { type: integer }
      responses:
        '200': { description: List }
  /transactions/{id}:
    get:
      summary: Get transaction
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        '200': { description: Item }
  /transactions/execute:
    post:
      summary: Execute a signed transaction
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                transaction_id: { type: string, format: uuid }
                signed_extrinsic: { type: string }
                chain: { type: string }
                token: { type: string }
                min_receive: { type: string }
                slippage_bps: { type: integer }
              required: [transaction_id, signed_extrinsic]
      responses:
        '200': { description: Submitted }
  /transactions/build:
    post:
      summary: Build transfer call
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                token: { type: string }
                amount: { type: string }
                recipient: { type: string }
                origin_chain: { type: string }
                destination_chain: { type: string }
                min_receive: { type: string }
                slippage_bps: { type: integer }
              required: [token, amount, recipient, origin_chain, destination_chain]
      responses:
        '200': { description: Call hex and fee }
  /transactions/xcm/build:
    post:
      summary: Build XCM transfer call
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                origin: { type: string }
                destination: { type: string }
                symbol: { type: string }
                amount: { type: string }
                sender: { type: string }
                recipient: { type: string }
              required: [origin, destination, symbol, amount, sender, recipient]
      responses:
        '200': { description: Call hex }
  /transactions/xcm/estimate:
    get:
      summary: Estimate XCM fee
      parameters:
        - in: query
          name: origin
          required: true
          schema: { type: string }
        - in: query
          name: destination
          required: true
          schema: { type: string }
        - in: query
          name: symbol
          required: true
          schema: { type: string }
        - in: query
          name: amount
          required: true
          schema: { type: string }
        - in: query
          name: recipient
          required: true
          schema: { type: string }
      responses:
        '200': { description: Fee }
  /wallet/connect:
    post:
      summary: Connect wallet with signature
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                wallet_address: { type: string }
                signature: { type: string }
                message: { type: string }
              required: [wallet_address, signature, message]
      responses:
        '200': { description: Connected }
  /wallet/balance:
    get:
      summary: Get balances
      parameters:
        - in: query
          name: wallet_address
          required: true
          schema: { type: string }
        - in: query
          name: token_symbols
          schema: { type: string }
      responses:
        '200': { description: Balances }
  /prices:
    get:
      summary: Get USD prices
      responses:
        '200': { description: Prices }
  /prices/convert:
    get:
      summary: Convert between tokens via USD
      parameters:
        - in: query
          name: amount
          required: true
          schema: { type: number }
        - in: query
          name: from
          required: true
          schema: { type: string }
        - in: query
          name: to
          required: true
          schema: { type: string }
      responses:
        '200': { description: Converted }
`;

docs.get('/openapi.yaml', (c) => c.text(openapiYaml, 200, { 'Content-Type': 'text/yaml; charset=utf-8' }));

docs.get('/docs', (c) => c.html(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VoiceDOT API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0;} #swagger-ui{max-width: 1100px; margin: 0 auto;}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger-ui'
    })
  </script>
</body>
</html>`));