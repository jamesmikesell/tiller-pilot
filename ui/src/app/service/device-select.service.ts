import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { ConfigService } from './config.service';
import { SensorGpsService } from './sensor-gps.service';
import { SensorOrientationService } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceSelectService {

  motorController: MockBoatSensorAndTillerController | BtMotorControllerService;
  orientationSensor: SensorOrientationService | MockBoatSensorAndTillerController;
  locationSensor: SensorGpsService | MockBoatSensorAndTillerController;

  constructor(
    public mockBoat: MockBoatSensorAndTillerController,
    public RealOrientationService: SensorOrientationService,
    public realBtMotorController: BtMotorControllerService,
    public realGpsSensor: SensorGpsService,
    configService: ConfigService,
  ) {

    if (configService.config.simulation) {
      this.motorController = mockBoat;
      this.orientationSensor = mockBoat;
      this.locationSensor = mockBoat;
    } else {
      this.motorController = realBtMotorController;
      this.orientationSensor = RealOrientationService;
      this.locationSensor = realGpsSensor;
    }

  }

}


