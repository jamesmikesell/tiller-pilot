import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FskModulationService } from './fsk-modulation.service';

@Injectable({
  providedIn: 'root'
})
export class BtMotorControllerService {

  connected = new BehaviorSubject<boolean>(false);

  private characteristic: BluetoothRemoteGATTCharacteristic;
  private fskUpdateSubscription: Subscription;
  private fskDirection: Direction;

  constructor(
    private fskService: FskModulationService,
  ) {
  }


  private fskUnsubscribe(): void {
    if (this.fskUpdateSubscription && !this.fskUpdateSubscription.closed) {
      this.fskUpdateSubscription.unsubscribe();
    }
  }


  async connect(): Promise<void> {
    const SERVICE_UUID = "dc05a09d-4d38-4ea9-af54-1add36c9a987"
    const CHARACTERISTIC_UUID = "c460751e-342b-4700-96ce-190ac0ac526e"

    let config: RequestDeviceOptions = {
      filters: [
        {
          namePrefix: "Tiller Pilot"
        }
      ],
      optionalServices: [SERVICE_UUID]
    };

    try {
      let device = await navigator.bluetooth.requestDevice(config);
      device.addEventListener("gattserverdisconnected", event => this.bluetoothDisconnected());
      console.log('Connecting to GATT Server...');
      let server = await device.gatt.connect();
      console.log('Getting Service...');
      let service = await server.getPrimaryService(SERVICE_UUID);
      console.log('Getting Characteristic...');
      this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      this.connected.next(true);
    } catch (error) {
      console.log(error);
    }
  }


  stop() {
    this.characteristic.writeValue(new Uint8Array([0, Direction.LEFT]));
  }

  move(direction: Direction): void {
    this.characteristic.writeValue(new Uint8Array([255, direction]));
  }

  moveFsk(direction: Direction, power: number): void {
    this.fskDirection = direction;
    
    if (power >= 1) {
      this.fskUnsubscribe();
      this.move(direction);
    } else if (power <= 0) {
      this.fskUnsubscribe();
      this.stop();
    } else {
      if (!this.fskUpdateSubscription || this.fskUpdateSubscription.closed) {
        this.fskUpdateSubscription = this.fskService.pulseState.subscribe(isOn => {
          if (isOn) {
            this.move(this.fskDirection);
          } else {
            this.stop();
          }
        });
      }

      this.fskService.setPowerPercent(power);
    }
  }

  private bluetoothDisconnected(): any {
    this.characteristic = undefined;
    this.connected.next(false);
  }

}


export enum Direction {
  RIGHT = 1,
  LEFT = 0,
}
