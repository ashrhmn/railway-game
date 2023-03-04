import { Module } from "@nestjs/common";
import { MapController } from "./map.controller";
import { MapService } from "./map.service";

@Module({ providers: [MapService], controllers: [MapController] })
export class MapModule { }
