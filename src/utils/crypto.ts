/**
 * Crypto Utility
 * Provides encryption, decryption, and cryptographic functions
 */

import crypto from 'crypto';
import CryptoJS from 'crypto-js';

export class CryptoService {
  private algorithm: string;
  private key: Buffer;
  private iv: Buffer;

  constructor(key?: string) {
    this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
    
    // Derive key from password using PBKDF2
    const masterKey = key || process.env.JWT_SECRET || 'default-insecure-key';
    this.key = crypto.pbkdf2Sync(masterKey, 'salt', 100000, 32, 'sha256');
    this.iv = crypto.randomBytes(16);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate secure random hash
   */
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  generateHMAC(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate random UUID
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash password using bcrypt-like approach
   */
  hashPassword(password: string, rounds: number = 10): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password
   */
  verifyPassword(password: string, hash: string): boolean {
    const [salt, originalHash] = hash.split(':');
    const newHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash), Buffer.from(newHash));
  }

  /**
   * Generate RSA key pair (for advanced use)
   */
  generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return {
      publicKey,
      privateKey,
    };
  }
}

export const cryptoService = new CryptoService();
export default CryptoService;
