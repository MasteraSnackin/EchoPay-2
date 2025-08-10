import { Hono } from 'hono';

export const docs = new Hono();

const openapiYaml = `openapi: 3.0.3
info:
  title: VoiceDOT API
  version: 0.1.0
  description: |
    Voice-controlled payments on Polkadot. Use /wallet/challenge + /wallet/connect for signature-based auth.
servers:
  - url: /
components:
  schemas:
    IntentItem:
      type: object
      properties:
        action: { type: string, enum: [transfer] }
        amount: { type: string, description: Human units or "$10" for USD conversion }
        token: { type: string, example: DOT }
        recipient: { type: string, description: SS58 address or alias }
        origin_chain: { type: string, example: polkadot }
        destination_chain: { type: string, example: polkadot }
      required: [action, amount, token, recipient, origin_chain, destination_chain]
    Intent:
      type: object
      properties:
        type: { type: string, enum: [single, batch] }
        language: { type: string }
        items:
          type: array
          items: { $ref: '#/components/schemas/IntentItem' }
        schedule: { type: string, nullable: true }
        condition: { type: string, nullable: true }
      required: [type, items]
    ConfirmationAudio:
      type: object
      properties:
        audio_base64: { type: string, description: Base64 MP3 }
        iv: { type: string, description: AES-GCM IV (base64) if encrypted }
        format: { type: string, example: mp3 }
        audio_url: { type: string, nullable: true, description: R2 URL if available }
    VoiceProcessResponse:
      type: object
      properties:
        transaction_ids:
          type: array
          items: { type: string, format: uuid }
        session_id: { type: string, format: uuid }
        intent: { $ref: '#/components/schemas/Intent' }
        confirmation: { $ref: '#/components/schemas/ConfirmationAudio' }
      required: [transaction_ids, session_id, intent, confirmation]
    VoiceConfirmResponse:
      type: object
      properties:
        status: { type: string, enum: [confirmed, failed] }
        transaction_ids:
          type: array
          items: { type: string, format: uuid }
        response: { $ref: '#/components/schemas/ConfirmationAudio' }
      required: [status, response]
    ExecuteRequest:
      type: object
      properties:
        transaction_id: { type: string, format: uuid }
        signed_extrinsic: { type: string, description: Hex without 0x }
        chain: { type: string, nullable: true }
        token: { type: string, nullable: true }
        min_receive: { type: string, nullable: true }
        slippage_bps: { type: integer, nullable: true }
      required: [transaction_id, signed_extrinsic]
    ExecuteResponse:
      type: object
      properties:
        transaction_hash: { type: string }
      required: [transaction_hash]
    BuildRequest:
      type: object
      properties:
        token: { type: string }
        amount: { type: string }
        recipient: { type: string }
        origin_chain: { type: string }
        destination_chain: { type: string }
        min_receive: { type: string, nullable: true }
        slippage_bps: { type: integer, nullable: true }
      required: [token, amount, recipient, origin_chain, destination_chain]
    BuildResponse:
      type: object
      properties:
        call_hex: { type: string }
        fee: { type: string, nullable: true }
      required: [call_hex]
    WalletChallengeRequest:
      type: object
      properties:
        wallet_address: { type: string }
      required: [wallet_address]
    WalletChallengeResponse:
      type: object
      properties:
        challenge_id: { type: string }
        message: { type: string }
        expires_at: { type: integer }
      required: [challenge_id, message, expires_at]
    WalletConnectRequest:
      type: object
      properties:
        wallet_address: { type: string }
        signature: { type: string }
        message: { type: string }
      required: [wallet_address, signature, message]
    WalletConnectResponse:
      type: object
      properties:
        user_id: { type: string }
      required: [user_id]
    WalletBalanceResponse:
      type: object
      properties:
        balances:
          type: object
          additionalProperties: { type: string }
      required: [balances]
    PricesResponse:
      type: object
      properties:
        prices_usd:
          type: object
          additionalProperties: { type: number }
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  service: { type: string }
                  time: { type: integer }
  /status/polkadot:
    get:
      summary: Polkadot network status
      responses:
        '200':
          description: Status
          content:
            application/json:
              schema:
                type: object
                properties:
                  connected: { type: boolean }
                  block: { type: string }
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
            examples:
              default:
                value: { audio_data: "<base64>", user_id: "14...", format: "webm" }
      responses:
        '200':
          description: Intent and confirmation audio
          content:
            application/json:
              schema: { $ref: '#/components/schemas/VoiceProcessResponse' }
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
        '200':
          description: Confirmation result
          content:
            application/json:
              schema: { $ref: '#/components/schemas/VoiceConfirmResponse' }
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
            schema: { $ref: '#/components/schemas/ExecuteRequest' }
      responses:
        '200':
          description: Submitted
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ExecuteResponse' }
  /transactions/build:
    post:
      summary: Build transfer call
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/BuildRequest' }
      responses:
        '200':
          description: Call hex and fee
          content:
            application/json:
              schema: { $ref: '#/components/schemas/BuildResponse' }
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
        '200':
          description: Call hex
          content:
            application/json:
              schema:
                type: object
                properties:
                  call_hex: { type: string }
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
        '200':
          description: Fee
          content:
            application/json:
              schema:
                type: object
                properties:
                  fee: { type: string }
  /wallet/challenge:
    post:
      summary: Issue a login challenge message
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/WalletChallengeRequest' }
      responses:
        '200':
          description: Challenge
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WalletChallengeResponse' }
  /wallet/connect:
    post:
      summary: Connect wallet with signature (use /wallet/challenge first)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/WalletConnectRequest' }
      responses:
        '200':
          description: Connected
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WalletConnectResponse' }
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
        '200':
          description: Balances
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WalletBalanceResponse' }
  /prices:
    get:
      summary: Get USD prices
      responses:
        '200':
          description: Prices
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PricesResponse' }
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