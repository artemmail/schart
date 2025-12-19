import { Component, Input, OnChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { OpenPosition } from 'src/app/models/fundamental.model';

@Component({
  standalone: false,
  selector: 'app-open-positions-table',
  templateUrl: './open-positions-table.component.html',
  styleUrls: ['./open-positions-table.component.css']
})
export class OpenPositionsTableComponent implements OnChanges {
  
  @Input() openPositions: OpenPosition;
  displayedColumns: string[] = ['label', 'juridicalLong', 'juridicalShort', 'physicalLong', 'physicalShort', 'total'];
  dataSource = new MatTableDataSource([]);

  ngOnChanges(): void {
    
      this.updateTable();
    
  }

  updateTable(): void {
    const lastPosition = this.openPositions;
    
    this.dataSource.data = [
      {
        label: 'Открытые позиции',
        juridicalLong: lastPosition.JuridicalLong,
        juridicalShort: lastPosition.JuridicalShort,
        physicalLong: lastPosition.PhysicalLong,
        physicalShort: lastPosition.PhysicalShort,
        total: lastPosition.JuridicalLong + lastPosition.JuridicalShort + lastPosition.PhysicalLong + lastPosition.PhysicalShort
      },
      {
        label: 'Изменение',
        juridicalLong: lastPosition.JuridicalLongDelta,
        juridicalShort: lastPosition.JuridicalShortDelta,
        physicalLong: lastPosition.PhysicalLongDelta,
        physicalShort: lastPosition.PhysicalShortDelta,
        total: lastPosition.JuridicalLongDelta + lastPosition.JuridicalShortDelta + lastPosition.PhysicalLongDelta + lastPosition.PhysicalShortDelta
      },
      {
        label: 'Количество лиц',
        juridicalLong: lastPosition.JuridicalLongCount,
        juridicalShort: lastPosition.JuridicalShortCount,
        physicalLong: lastPosition.PhysicalLongCount,
        physicalShort: lastPosition.PhysicalShortCount,
        total: lastPosition.JuridicalLongCount + lastPosition.JuridicalShortCount + lastPosition.PhysicalLongCount + lastPosition.PhysicalShortCount
      }
    ];
  }
}
