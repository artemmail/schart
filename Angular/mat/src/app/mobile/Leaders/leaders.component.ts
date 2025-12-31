import { Component } from '@angular/core';
import { LeaderboardTableComponent } from 'src/app/components/Controls/leaderboard-table/leaderboard-table.component';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  standalone: true,

  imports: [CommonModule, MatTabsModule, LeaderboardTableComponent],
  selector: 'mobile-leaders',
  
  templateUrl: './leaders.component.html',
  styleUrls: ['./leaders.component.css']
})
export class LeadersComponent {

}
