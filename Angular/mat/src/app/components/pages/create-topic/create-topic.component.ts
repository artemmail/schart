import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/service/auth.service';
import { NewsService } from 'src/app/service/news.service';
import { MaterialModule } from 'src/app/material.module';
import { EditorComponent } from '../../Controls/timy-mce/app-editor.component';

import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-create-topic',
  imports: [CommonModule, MaterialModule, EditorComponent],
  templateUrl: './create-topic.component.html',
  styleUrls: ['./create-topic.component.css']
})
export class CreateTopicComponent implements OnInit {
  createTopicForm: FormGroup;
  loggedIn: boolean = false;


  constructor(
    private fb: FormBuilder,
    private newsService: NewsService,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    titleService.setTitle("StockChart.ru Создать тему");
    this.createTopicForm = this.fb.group({
      header: ['', Validators.required],
      text: ['', Validators.required]
    });
  }

  ngOnInit(): void {    
      this.loggedIn = this.authService.isAuthenticated();    
  }

  onSubmit(): void {
    if (this.createTopicForm.valid) {
      const { header, text } = this.createTopicForm.value;
      this.newsService.createTopic(header, text).subscribe(() => {
        this.router.navigate(['/']); // Navigate to a different page after creation
      });
    }
  }
}
