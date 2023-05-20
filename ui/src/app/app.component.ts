import { Component } from '@angular/core';
import { AppVersion } from './app-version';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  AppVersion = AppVersion;

}

