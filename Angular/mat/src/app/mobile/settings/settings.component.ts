import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  currentPage: string | undefined;

  constructor(private router: Router) {}

  ngOnInit() {
    this.currentPage = this.router.url.split('/').pop();
  }
}
