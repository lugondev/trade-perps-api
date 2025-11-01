import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, keccak256, getBytes } from 'ethers';
import { encode } from '@msgpack/msgpack';
import { HyperliquidConfig } from '../../../config/hyperliquid.config';

export interface SignedAction {
  action: any;
  nonce: number;
  signature: {
    r: string;
    s: string;
    v: number;
  };
  vaultAddress?: string;
  user?: string;
}

const PHANTOM_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const AGENT_TYPES = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);
  private readonly wallet: ethers.Wallet;
  private readonly hyperliquidConfig: HyperliquidConfig;

  constructor(private configService: ConfigService) {
    this.hyperliquidConfig = this.configService.get<HyperliquidConfig>('hyperliquid')!;

    this.logger.log('🔍 SigningService - Checking credentials...');
    this.logger.log(`User Address: ${this.hyperliquidConfig.userAddress || 'NOT SET'}`);
    this.logger.log(`API Wallet (config): ${this.hyperliquidConfig.apiWallet || 'NOT SET'}`);
    this.logger.log(
      `API Private Key: ${this.hyperliquidConfig.apiPrivateKey ? this.hyperliquidConfig.apiPrivateKey.substring(0, 10) + '...' : 'NOT SET'}`,
    );

    if (!this.hyperliquidConfig.apiPrivateKey) {
      throw new Error('HYPERLIQUID_API_PRIVATE_KEY is required for signing');
    }

    // Initialize ethers wallet
    this.wallet = new ethers.Wallet(this.hyperliquidConfig.apiPrivateKey);

    this.logger.log(`✅ Signing service initialized`);
    this.logger.log(`API Wallet (derived from private key): ${this.wallet.address}`);
    this.logger.log(`API Wallet (from .env): ${this.hyperliquidConfig.apiWallet}`);
    this.logger.log(
      `Match: ${this.wallet.address.toLowerCase() === this.hyperliquidConfig.apiWallet?.toLowerCase() ? '✓' : '✗ MISMATCH!'}`,
    );
  }

  /**
   * Sign L1 action following Python SDK implementation
   * https://github.com/hyperliquid-dex/hyperliquid-python-sdk
   */
  async signL1Action(
    action: any,
    vaultAddress?: string,
    nonce?: number,
    expiresAfter?: number,
  ): Promise<SignedAction> {
    const timestamp = nonce || Date.now();

    this.logger.debug(`Signing L1 action...`);
    this.logger.debug(`Action: ${JSON.stringify(action)}`);
    this.logger.debug(`Nonce: ${timestamp}`);
    this.logger.debug(`Vault: ${vaultAddress || 'none'}`);
    this.logger.debug(`Expires After: ${expiresAfter || 'none'}`);
    this.logger.debug(`Is Testnet: ${this.hyperliquidConfig.isTestnet}`);

    // Create action hash (with expires_after support)
    const hash = this.actionHash(action, vaultAddress || null, timestamp, expiresAfter || null);
    this.logger.debug(`Action hash: ${hash}`);

    // Construct phantom agent
    const phantomAgent = this.constructPhantomAgent(hash, !this.hyperliquidConfig.isTestnet);
    this.logger.debug(`Phantom agent: ${JSON.stringify(phantomAgent)}`);

    // Sign using EIP-712
    const signature = await this.wallet.signTypedData(PHANTOM_DOMAIN, AGENT_TYPES, phantomAgent);

    const sig = this.splitSignature(signature);
    this.logger.debug(`Signature generated: ${JSON.stringify(sig)}`);

    // Construct the signed action payload
    const result: SignedAction = {
      action,
      nonce: timestamp,
      signature: sig,
    };

    if (vaultAddress) {
      result.vaultAddress = vaultAddress;
    }

    this.logger.debug(`Signed action:`, JSON.stringify(result));

    return result;
  }

  /**
   * Create action hash (following Python SDK implementation)
   * Matches: action_hash(action, vault_address, nonce, expires_after)
   */
  private actionHash(
    action: unknown,
    vaultAddress: string | null,
    nonce: number,
    expiresAfter: number | null,
  ): string {
    // Normalize trailing zeros
    const normalizedAction = this.normalizeTrailingZeros(action);

    // Pack action with msgpack
    const msgPackBytes = encode(normalizedAction);

    // Calculate additional bytes length
    let additionalBytesLength = 8; // nonce (8 bytes)
    additionalBytesLength += vaultAddress === null ? 1 : 21; // vault marker (1) + address (20)
    if (expiresAfter !== null) {
      additionalBytesLength += 9; // expires marker (1) + timestamp (8)
    }

    const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
    data.set(msgPackBytes);

    let offset = msgPackBytes.length;
    const view = new DataView(data.buffer);

    // Add nonce (8 bytes, big-endian)
    view.setBigUint64(offset, BigInt(nonce), false);
    offset += 8;

    // Add vault address
    if (vaultAddress === null) {
      view.setUint8(offset, 0);
      offset += 1;
    } else {
      view.setUint8(offset, 1);
      offset += 1;
      data.set(getBytes(vaultAddress), offset);
      offset += 20;
    }

    // Add expires_after if present
    if (expiresAfter !== null) {
      view.setUint8(offset, 0);
      offset += 1;
      view.setBigUint64(offset, BigInt(expiresAfter), false);
    }

    return keccak256(data);
  }

  /**
   * Construct phantom agent
   */
  private constructPhantomAgent(hash: string, isMainnet: boolean) {
    return { source: isMainnet ? 'a' : 'b', connectionId: hash };
  }

  /**
   * Split signature into r, s, v components
   */
  private splitSignature(sig: string): { r: string; s: string; v: number } {
    const { r, s, v } = ethers.Signature.from(sig);
    return { r, s, v };
  }

  /**
   * Normalize trailing zeros from price and size fields
   */
  private normalizeTrailingZeros<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeTrailingZeros(item)) as unknown as T;
    }

    const result = { ...obj };

    for (const key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const value = result[key];

        if (value && typeof value === 'object') {
          result[key] = this.normalizeTrailingZeros(value);
        } else if ((key === 'p' || key === 's') && typeof value === 'string') {
          result[key] = this.removeTrailingZeros(value) as any;
        }
      }
    }

    return result;
  }

  /**
   * Remove trailing zeros from string
   */
  private removeTrailingZeros(value: string): string {
    if (!value.includes('.')) return value;
    const normalized = value.replace(/\.?0+$/, '');
    if (normalized === '-0') return '0';
    return normalized;
  }

  /**
   * Get wallet address (API wallet)
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get user address (master account)
   */
  getUserAddress(): string {
    return this.hyperliquidConfig.userAddress;
  }
}
