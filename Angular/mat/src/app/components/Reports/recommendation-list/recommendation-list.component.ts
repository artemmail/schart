import { Component, OnInit, Input } from '@angular/core';
import { Recommendation } from 'src/app/models/fundamental.model';
import { DataService } from 'src/app/service/companydata.service';


@Component({
  standalone: false,
  selector: 'app-recommendation-list',
  templateUrl: './recommendation-list.component.html',
  styleUrls: ['./recommendation-list.component.css']
})
export class RecommendationListComponent implements OnInit {
  @Input() ticker!: string;
  recommendation!: Recommendation;

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    if (this.ticker) {
      this.dataService.loadRecommendations(this.ticker).subscribe(
        (data: Recommendation) => this.recommendation = data,
        error => console.error('Ошибка при загрузке рекомендаций', error)
      );
    }
  }

  hasReasonsUp(): boolean {
    return this.recommendation?.ReasonsUp?.length > 0;
  }

  hasReasonsDown(): boolean {
    return this.recommendation?.ReasonsDown?.length > 0;
  } 
}
