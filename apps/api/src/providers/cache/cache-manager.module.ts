import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache-manager.service";

@Global()
@Module({ providers: [CacheService], exports: [CacheService] })
export class CacheManagerModule {}
