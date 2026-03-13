import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from "./pages/dashboard/dashboard";
import { LoginComponent } from "./pages/login/login";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DashboardComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('y');
}
