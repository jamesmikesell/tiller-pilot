import { Injectable } from '@angular/core';
import { BehaviorSubject, timer } from 'rxjs';
import { Controller } from './controller';

@Injectable({
  providedIn: 'root'
})
export class BtMotorControllerService implements Controller {

  connected = new BehaviorSubject<boolean>(false);

  private characteristic: BluetoothRemoteGATTCharacteristic;
  private nextPowerLevel = 0;
  private gatt: BluetoothRemoteGATTServer;

  constructor(
  ) {
    timer(0, 200)
      .subscribe(() => {
        if (!this.connected.value)
          return;

        if (this.nextPowerLevel === 0)
          this.stop();
        else if (this.nextPowerLevel > 0)
          this.move(Direction.RIGHT, this.nextPowerLevel)
        else
          this.move(Direction.LEFT, Math.abs(this.nextPowerLevel))
      });

  }


  disconnect(): void {
    if (this.gatt){
      this.characteristic = undefined;
      this.connected.next(false);
      this.gatt.disconnect();
      this.gatt = undefined;  
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
      this.gatt = device.gatt;
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


  stop(): void {
    this.characteristic.writeValue(new Uint8Array([0, Direction.LEFT]));
  }

  private async move(direction: Direction, powerPercent: number): Promise<void> {
    let level = Math.round(powerPercent * 255);
    this.characteristic.writeValue(new Uint8Array([level, direction]));
  }


  command(level: number): void {
    this.nextPowerLevel = level;
  }


  private bluetoothDisconnected(): any {
    this.characteristic = undefined;
    this.connected.next(false);
  }

}


enum Direction {
  RIGHT = 1,
  LEFT = 0,
}
