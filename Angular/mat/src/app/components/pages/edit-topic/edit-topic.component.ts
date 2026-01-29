import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/service/auth.service';
import { NewsService } from 'src/app/service/news.service';
import { MaterialModule } from 'src/app/material.module';
import { EditorComponent } from '../../Controls/timy-mce/app-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { TopicAdminEditDialogComponent } from '../../Dialogs/topic-admin-edit-dialog/topic-admin-edit-dialog.component';

import { Topic } from 'src/app/models/UserTopic';
import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-edit-topic',
  imports: [CommonModule, MaterialModule, EditorComponent],
  templateUrl: './edit-topic.component.html',
  styleUrls: ['./edit-topic.component.css']
})
export class EditTopicComponent implements OnInit {
  editTopicForm: FormGroup;
  loggedIn: boolean = false;
  isAdmin: boolean = false;

  topicId: number;
  currentTopic: Topic | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private newsService: NewsService,
    private authService: AuthService,
    private dialog: MatDialog,
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
      this.isAdmin = this.authService.isAdmin();
    

    this.route.params.subscribe(params => {
      this.topicId = +params['id'];
      this.loadTopic(this.topicId);
    });
  }

  loadTopic(id: number): void {
    this.newsService.getTopic(id).subscribe((topic: Topic) => {
      this.currentTopic = topic;
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

  openAdminDialog(): void {
    if (!this.isAdmin || !this.currentTopic) {
      return;
    }

    const dialogRef = this.dialog.open(TopicAdminEditDialogComponent, {
      data: {
        Hide: this.currentTopic.Hide ?? false,
        Author: this.currentTopic.TopicUser?.UserName ?? '',
        Date: this.currentTopic.Date
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }

      const { hide, author, date } = result;
      this.newsService.updateTopicAdmin(this.topicId, hide, author, date).subscribe(() => {
        if (this.currentTopic) {
          this.currentTopic.Hide = hide;
          this.currentTopic.Date = date;
          if (this.currentTopic.TopicUser) {
            this.currentTopic.TopicUser.UserName = author;
          }
        }
      });
    });
  }
}
