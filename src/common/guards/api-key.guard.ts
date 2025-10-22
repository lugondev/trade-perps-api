import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException,
	Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
	private readonly logger = new Logger(ApiKeyGuard.name);
	private readonly apiKey: string;

	constructor(
		private configService: ConfigService,
		private reflector: Reflector,
	) {
		this.apiKey = this.configService.get<string>('API_KEY_ACCESS') || '';

		if (!this.apiKey) {
			this.logger.warn('⚠️  API_KEY_ACCESS is not configured. API key authentication will fail.');
		}
	}

	canActivate(context: ExecutionContext): boolean {
		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const apiKeyFromHeader = this.extractApiKeyFromHeader(request);

		if (!apiKeyFromHeader) {
			this.logger.warn('API key is missing from request headers');
			throw new UnauthorizedException('API key is required');
		}

		if (apiKeyFromHeader !== this.apiKey) {
			this.logger.warn('Invalid API key provided');
			throw new UnauthorizedException('Invalid API key');
		}

		return true;
	}

	private extractApiKeyFromHeader(request: any): string | undefined {
		// Support multiple header formats
		const apiKey =
			request.headers['x-api-key'] ||
			request.headers['api-key'] ||
			request.headers['authorization']?.replace('Bearer ', '');

		return apiKey;
	}
}
