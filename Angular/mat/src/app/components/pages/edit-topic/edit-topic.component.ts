import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/service/auth.service';
import { NewsService } from 'src/app/service/news.service';

import { Topic } from 'src/app/models/UserTopic';
import { Title } from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'app-edit-topic',
  templateUrl: './edit-topic.component.html',
  styleUrls: ['./edit-topic.component.css']
})
export class EditTopicComponent implements OnInit {
  editTopicForm: FormGroup;
  loggedIn: boolean = false;

  topicId: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private newsService: NewsService,
    private authService: AuthService,
    private router: Router, private titleService: Title
  ) {
    titleService.setTitle("StockChart.ru Редактировать тему");
    this.editTopicForm = this.fb.group({
      header: ['', Validators.required],
      text: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    
      this.loggedIn = this.authService.isAuthenticated();
    

    this.route.params.subscribe(params => {
      this.topicId = +params['id'];
      this.loadTopic(this.topicId);
    });
  }

  loadTopic(id: number): void {
    this.newsService.getTopic(id).subscribe((topic: Topic) => {
      this.editTopicForm.setValue({
        header: topic.Header,
        text: topic.Text
      });
    });
  }

  onSubmit(): void {
    if (this.editTopicForm.valid) {
      const { header, text } = this.editTopicForm.value;
      this.newsService.updateTopic(this.topicId, header, text).subscribe(() => {
        this.router.navigate(['/']); // Navigate to a different page after updating
      });
    }
  }
}
