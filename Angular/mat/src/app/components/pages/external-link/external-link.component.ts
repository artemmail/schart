import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-external-link',
  standalone: true,
  imports: [],
  templateUrl: './external-link.component.html',
  styleUrl: './external-link.component.css',
})
export class ExternalLinkComponent implements OnInit, OnDestroy {
  externalUrl: string | null = null;
  private queryParamsSubscription?: Subscription;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      this.externalUrl = this.normalizeExternalUrl(params.get('u'));
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
  }

  private normalizeExternalUrl(rawUrl: string | null): string | null {
    if (!rawUrl) {
      return null;
    }

    let candidate = rawUrl.trim();
    if (!candidate) {
      return null;
    }

    for (let i = 0; i < 2; i += 1) {
      const decoded = this.tryDecode(candidate);
      if (!decoded || decoded === candidate) {
        break;
      }

      candidate = decoded.trim();
    }

    try {
      const parsedUrl = new URL(candidate);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return null;
      }

      return parsedUrl.toString();
    } catch {
      return null;
    }
  }

  private tryDecode(value: string): string | null {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
}
