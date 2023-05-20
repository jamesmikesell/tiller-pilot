import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { Controller } from './controller';
import { SensorOrientationService } from './sensor-orientation.service';
import { SensorGpsService } from './sensor-gps.service';

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
  ) {

    if (!true) {
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


