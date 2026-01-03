// src/app/components/option-details/option-details.component.ts
import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { OptionCodeModel, OptionData } from 'src/app/models/option-data.model';
import {  OptionCodeService } from 'src/app/service/OptionCodeParserService.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-option-details',
  imports: [MaterialModule],
  templateUrl: './option-details.component.html',
  styleUrls: ['./option-details.component.css']
})
export class OptionDetailsComponent implements OnInit {
  optionData: OptionCodeModel | null = null;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private parser: OptionCodeService,
    private titleService: Title

  ) { 


  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const code = params.get('code');
      if (code) {
        try {
          this.titleService.setTitle(`Опцион ${code} информация и график`);
          this.optionData = this.parser.parseCode(code);
          // Если нужно добавить дополнительные поля, такие как optionType, expirationType, можно расширить парсинг
        } catch (error: any) {
          this.errorMessage = error.message;
          this.optionData = null;
        }
      } else {
        this.errorMessage = 'Код опциона не указан в URL.';
      }
    });
  }
}
