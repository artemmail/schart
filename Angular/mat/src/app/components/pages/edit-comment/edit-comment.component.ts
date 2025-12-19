import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/service/auth.service';
import { NewsService } from 'src/app/service/news.service';
import { Title } from '@angular/platform-browser';
import { Comment } from 'src/app/models/UserTopic';

@Component({
  selector: 'app-edit-comment',
  templateUrl: './edit-comment.component.html',
  styleUrls: ['./edit-comment.component.css']
})
export class EditCommentComponent implements OnInit {
  editCommentForm: FormGroup;
  loggedIn: boolean = false;
  commentId: number;
  topicId: number; 

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private newsService: NewsService,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
  ) {
    titleService.setTitle("StockChart.ru Редактировать комментарий");
    this.editCommentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loggedIn = this.authService.isAuthenticated();

    this.route.params.subscribe(params => {
      this.commentId = +params['id'];
      this.loadComment(this.commentId);
    });
  }

  loadComment(id: number): void {
    this.newsService.getComment(id).subscribe((comment: Comment) => {
      this.editCommentForm.patchValue({
        text: comment.Text
      });
      this.topicId = comment.TopicId; // Store the Topic ID
    });
  }

  onSubmit(): void {
    if (this.editCommentForm.valid) {
      const { text } = this.editCommentForm.value;
      this.newsService.editComment(this.commentId, text).subscribe(() => {
        this.router.navigate(['/ServiceNews/Details', this.topicId]); // Navigate back to the details page
      });
    }
  }
}
