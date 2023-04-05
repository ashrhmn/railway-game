import { Module } from "@nestjs/common";
import { NftModule } from "../nft/nft.module";
import { EventsService } from "./events.service";

@Module({
  providers: [EventsService],
  exports: [EventsService],
  imports: [NftModule],
})
export class EventsModule {}
