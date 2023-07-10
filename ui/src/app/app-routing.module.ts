import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestComponent } from './component/test/test.component';
import { ConfigComponent } from './component/config/config.component';

const routes: Routes = [
  {
    path: '',
    component: TestComponent
  },
  {
    path: 'config',
    component: ConfigComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
