import { Injectable } from '@angular/core';
import { marked } from 'marked';
import * as katex from 'katex';

@Injectable({
  providedIn: 'root',
})
export class MarkdownRendererService {
  renderMath(content: string): string {
    if (!content) {
      return '';
    }

    let source = content.replace(/\\\$/g, '$$$$$$');

    source = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
      try {
        return `<div class="katex-block">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        })}</div>`;
      } catch {
        return `<div class="katex-error">${equation}</div>`;
      }
    });

    source = source.replace(/\\\[([\s\S]+?)\\\]/g, (_, equation) => {
      try {
        return `<div class="katex-block">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: true,
        })}</div>`;
      } catch {
        return `<div class="katex-error">${equation}</div>`;
      }
    });

    source = source.replace(
      /(?<!\\)\$(?!\$)([\s\S]+?)(?<!\\)\$(?!\$)/g,
      (_, equation) => {
        const trimmedEquation = equation.trim();
        if (
          /^\d/.test(trimmedEquation) ||
          /^[0-9.,+\-*/^() ]+$/.test(trimmedEquation)
        ) {
          return `$${equation}$`;
        }

        try {
          return `<span class="katex-inline">${katex.renderToString(equation, {
            throwOnError: false,
            displayMode: false,
          })}</span>`;
        } catch {
          return `<span class="katex-error">${equation}</span>`;
        }
      }
    );

    source = source.replace(/\\\(([\s\S]+?)\\\)/g, (_, equation) => {
      try {
        return `<span class="katex-inline">${katex.renderToString(equation, {
          throwOnError: false,
          displayMode: false,
        })}</span>`;
      } catch {
        return `<span class="katex-error">${equation}</span>`;
      }
    });

    source = source.replace(/\$\$\$\$\$\$/g, '\\$');

    const parsed = marked.parse(source);
    return typeof parsed === 'string' ? parsed : '';
  }
}
