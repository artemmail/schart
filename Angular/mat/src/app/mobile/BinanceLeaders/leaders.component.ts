import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { LeaderboardTableComponent } from 'src/app/components/Controls/leaderboard-table/leaderboard-table.component';

@Component({
  standalone: true,
  imports: [CommonModule, MatTabsModule, LeaderboardTableComponent],
  selector: 'mobile-binance-leaders',
  
  templateUrl: './leaders.component.html',
  styleUrls: ['./leaders.component.css']
})
export class LeadersBinanceComponent {

}
