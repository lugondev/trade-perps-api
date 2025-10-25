import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
// @ts-ignore - package.json exports /signing but TypeScript may not resolve it correctly
import { signL1Action } from '@nktkas/hyperliquid/signing';
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
}

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
		this.logger.log(`API Private Key: ${this.hyperliquidConfig.apiPrivateKey ? this.hyperliquidConfig.apiPrivateKey.substring(0, 10) + '...' : 'NOT SET'}`);

		if (!this.hyperliquidConfig.apiPrivateKey) {
			throw new Error('HYPERLIQUID_API_PRIVATE_KEY is required for signing');
		}

		// Initialize ethers wallet for use with @nktkas/hyperliquid signing
		this.wallet = new ethers.Wallet(this.hyperliquidConfig.apiPrivateKey);

		this.logger.log(`✅ Signing service initialized with official @nktkas/hyperliquid SDK`);
		this.logger.log(`API Wallet (derived from private key): ${this.wallet.address}`);
		this.logger.log(`API Wallet (from .env): ${this.hyperliquidConfig.apiWallet}`);
		this.logger.log(`Match: ${this.wallet.address.toLowerCase() === this.hyperliquidConfig.apiWallet?.toLowerCase() ? '✓' : '✗ MISMATCH!'}`);
	}

	/**
	 * Sign action using official @nktkas/hyperliquid SDK
	 */
	async signL1Action(
		action: any,
		vaultAddress?: string,
		nonce?: number,
	): Promise<SignedAction> {
		const timestamp = nonce || Date.now();

		this.logger.debug(`Signing L1 action with official SDK...`);
		this.logger.debug(`Action: ${JSON.stringify(action)}`);
		this.logger.debug(`Nonce: ${timestamp}`);
		this.logger.debug(`Vault: ${vaultAddress || 'none'}`);
		this.logger.debug(`Is Testnet: ${this.hyperliquidConfig.isTestnet}`);

		// Use official SDK signL1Action function
		const signature = await signL1Action({
			wallet: this.wallet as any, // ethers v6 wallet is compatible
			action,
			nonce: timestamp,
			isTestnet: this.hyperliquidConfig.isTestnet,
			vaultAddress: vaultAddress as `0x${string}` | undefined,
		});

		this.logger.debug(`Signature generated: ${JSON.stringify(signature)}`);

		// Construct the signed action payload
		const result: SignedAction = {
			action,
			nonce: timestamp,
			signature: {
				r: signature.r,
				s: signature.s,
				v: signature.v,
			},
		};

		if (vaultAddress) {
			result.vaultAddress = vaultAddress;
		}

		this.logger.debug(`Signed action:`, JSON.stringify(result));

		return result;
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
