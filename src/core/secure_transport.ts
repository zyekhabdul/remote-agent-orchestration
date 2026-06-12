/**
 * Secure Transport
 * Handles TLS, encryption/decryption, and message signing
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@utils/logger';
import { CryptoService } from '@utils/crypto';
import { appConfig } from '@config/app.config';

export interface SecureMessage {
  id: string;
  sender: string;
  recipient: string;
  payload: unknown;
  signature: string;
  timestamp: Date;
  encrypted: boolean;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

export class SecureTransport {
  private cryptoService: CryptoService;
  private tlsKeyPath: string;
  private tlsCertPath: string;

  constructor() {
    this.cryptoService = new CryptoService();
    this.tlsKeyPath = appConfig.tlsKeyPath;
    this.tlsCertPath = appConfig.tlsCertPath;
  }

  /**
   * Load TLS certificate and key
   */
  loadTLSCredentials(): { key: Buffer; cert: Buffer } | null {
    if (!appConfig.tlsEnabled) {
      return null;
    }

    try {
      const key = fs.readFileSync(this.tlsKeyPath);
      const cert = fs.readFileSync(this.tlsCertPath);
      logger.info('TLS credentials loaded successfully');
      return { key, cert };
    } catch (error) {
      logger.error('Failed to load TLS credentials', error);
      return null;
    }
  }

  /**
   * Create self-signed certificate (for development)
   */
  createSelfSignedCertificate(): void {
    try {
      const { execSync } = require('child_process');
      const certDir = path.dirname(this.tlsCertPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
      }

      // Check if cert already exists
      if (fs.existsSync(this.tlsCertPath) && fs.existsSync(this.tlsKeyPath)) {
        logger.info('TLS certificate already exists');
        return;
      }

      // Generate self-signed certificate
      const cmd = `openssl req -x509 -newkey rsa:2048 -keyout ${this.tlsKeyPath} -out ${this.tlsCertPath} -days 365 -nodes -subj "/CN=localhost"`;
      execSync(cmd);

      logger.info('Self-signed TLS certificate created');
    } catch (error) {
      logger.warn('Failed to create self-signed certificate', error);
    }
  }

  /**
   * Encrypt message
   */
  encryptMessage(message: SecureMessage): EncryptedMessage {
    try {
      const payload = JSON.stringify(message);
      const { encrypted, iv, authTag } = this.cryptoService.encrypt(payload);

      return {
        ciphertext: encrypted,
        iv,
        authTag,
        algorithm: appConfig.encryptionAlgorithm,
      };
    } catch (error) {
      logger.error('Failed to encrypt message', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt message
   */
  decryptMessage(encrypted: EncryptedMessage): SecureMessage {
    try {
      const payload = this.cryptoService.decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      return JSON.parse(payload) as SecureMessage;
    } catch (error) {
      logger.error('Failed to decrypt message', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Sign message
   */
  signMessage(message: SecureMessage): string {
    try {
      const payload = JSON.stringify(message);
      const secret = process.env.JWT_SECRET || 'default-secret';
      return this.cryptoService.generateHMAC(payload, secret);
    } catch (error) {
      logger.error('Failed to sign message', error);
      throw new Error('Message signing failed');
    }
  }

  /**
   * Verify message signature
   */
  verifyMessageSignature(message: SecureMessage, signature: string): boolean {
    try {
      const payload = JSON.stringify(message);
      const secret = process.env.JWT_SECRET || 'default-secret';
      return this.cryptoService.verifyHMAC(payload, signature, secret);
    } catch (error) {
      logger.error('Failed to verify message signature', error);
      return false;
    }
  }

  /**
   * Create secure message
   */
  createSecureMessage(
    sender: string,
    recipient: string,
    payload: unknown,
    shouldEncrypt: boolean = true
  ): SecureMessage | EncryptedMessage {
    const message: SecureMessage = {
      id: this.cryptoService.generateUUID(),
      sender,
      recipient,
      payload,
      signature: '',
      timestamp: new Date(),
      encrypted: shouldEncrypt,
    };

    // Sign the message
    message.signature = this.signMessage(message);

    // Encrypt if needed
    if (shouldEncrypt) {
      return this.encryptMessage(message);
    }

    return message;
  }

  /**
   * Validate secure message
   */
  validateSecureMessage(message: SecureMessage): boolean {
    // Check if message is not expired (5 minutes)
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge > 5 * 60 * 1000) {
      logger.warn('Message is expired', { age: messageAge });
      return false;
    }

    // Verify signature
    const isValid = this.verifyMessageSignature(message, message.signature);
    if (!isValid) {
      logger.warn('Message signature verification failed');
      return false;
    }

    return true;
  }

  /**
   * Derive shared secret (for agent authentication)
   */
  deriveSharedSecret(agentId: string, secret: string): string {
    const combined = `${agentId}:${secret}`;
    return this.cryptoService.generateHash(combined);
  }

  /**
   * Get TLS certificate info
   */
  getTLSInfo(): Record<string, unknown> {
    try {
      const cert = fs.readFileSync(this.tlsCertPath, 'utf8');
      return {
        enabled: appConfig.tlsEnabled,
        algorithm: appConfig.encryptionAlgorithm,
        certPath: this.tlsCertPath,
        keyPath: this.tlsKeyPath,
      };
    } catch {
      return {
        enabled: appConfig.tlsEnabled,
        algorithm: appConfig.encryptionAlgorithm,
      };
    }
  }
}

export const secureTransport = new SecureTransport();
export default SecureTransport;
