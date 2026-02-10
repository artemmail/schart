import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import {
  McpConsoleService,
  McpChatHistoryItem,
  McpChatResponse,
  McpProviderResponse,
} from 'src/app/service/mcp-console.service';

type ChatRole = 'user' | 'assistant' | 'system' | 'error';

interface ChatMessage {
  role: ChatRole;
  timestamp: Date;
  text: string;
  provider?: string;
  model?: string;
  data?: unknown;
  suggestions?: string[];
}

@Component({
  standalone: true,
  selector: 'app-mcp-console',
  imports: [MaterialModule],
  templateUrl: './mcp-console.component.html',
  styleUrls: ['./mcp-console.component.css'],
})
export class McpConsoleComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [];
  userInput = '';
  sending = false;
  providerName = 'local';
  providerModel = '';
  providerHasApiKey = false;

  quickPrompts = [
    'покажи рынки',
    'дивиденды SBER',
    'барометр SBER GAZP',
    '/tools',
    '/help',
  ];

  constructor(
    private readonly mcpService: McpConsoleService,
    private readonly titleService: Title
  ) {
    this.titleService.setTitle('MCP Console');
  }

  ngOnInit(): void {
    this.loadProviderInfo();
    this.startConversation();
  }

  sendMessage(): void {
    const message = (this.userInput || '').trim();
    if (!message || this.sending) {
      return;
    }

    const history = this.buildHistory();
    this.userInput = '';
    this.pushMessage('user', message);
    this.sending = true;

    this.mcpService.chat(message, history).subscribe({
      next: (response: McpChatResponse) => {
        const normalized = this.normalizeChatResponse(response);
        this.updateProviderFromChatResponse(normalized);

        this.pushMessage(
          normalized.isError ? 'error' : 'assistant',
          normalized.answer,
          normalized.data,
          normalized.suggestions,
          normalized.provider || this.providerName,
          normalized.model || this.providerModel
        );

        if (normalized.stderr) {
          this.pushMessage('system', 'MCP stderr', normalized.stderr);
        }

        if (normalized.warnings && normalized.warnings.length > 0) {
          this.pushMessage('system', 'Bridge warnings', normalized.warnings);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.pushMessage('error', 'Ошибка запроса к MCP bridge.', this.extractHttpError(error));
      },
      complete: () => {
        this.sending = false;
      },
    });
  }

  onComposerKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  applySuggestion(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  clearConversation(): void {
    this.messages = [];
    this.startConversation();
  }

  get providerLabel(): string {
    const model = this.providerModel ? ` (${this.providerModel})` : '';
    const keyState =
      this.providerName === 'openai'
        ? this.providerHasApiKey
          ? 'key:ok'
          : 'key:missing'
        : 'rules';
    return `provider: ${this.providerName}${model} | ${keyState}`;
  }

  private startConversation(): void {
    this.messages = [];
    this.pushMessage(
      'assistant',
      'MCP chat готов. Пишите обычным языком или командами `/help`, `/tools`, `/tool`, `/rpc`.',
      {
        examples: [
          'покажи рынки',
          'дивиденды SBER',
          'барометр SBER GAZP',
          '/tool list_markets {}',
        ],
      }
    );
  }

  private loadProviderInfo(): void {
    this.mcpService.getProvider().subscribe({
      next: (response: McpProviderResponse) => {
        this.providerName = response.provider || 'local';
        this.providerModel = response.openAi?.model || '';
        this.providerHasApiKey = !!response.openAi?.hasApiKey;
      },
      error: () => {
        this.providerName = 'local';
        this.providerModel = '';
        this.providerHasApiKey = false;
      },
    });
  }

  private updateProviderFromChatResponse(response: McpChatResponse): void {
    if (response.provider) {
      this.providerName = response.provider;
    }
    if (response.model !== undefined) {
      this.providerModel = response.model || '';
    }
  }

  private normalizeChatResponse(response: unknown): McpChatResponse {
    const source = (response ?? {}) as Record<string, unknown>;

    const isError = (source['isError'] ?? source['IsError'] ?? false) as boolean;
    const provider = (source['provider'] ?? source['Provider']) as string | undefined;
    const model = (source['model'] ?? source['Model']) as string | undefined;
    const answerValue = (source['answer'] ?? source['Answer'] ?? '') as unknown;
    const answer = typeof answerValue === 'string' ? answerValue : JSON.stringify(answerValue);
    const executedTool = (source['executedTool'] ?? source['ExecutedTool']) as string | undefined;
    const argumentsValue = source['arguments'] ?? source['Arguments'];
    const data = source['data'] ?? source['Data'];
    const stderr = (source['stderr'] ?? source['Stderr']) as string | undefined;
    const warnings = (source['warnings'] ?? source['Warnings']) as string[] | undefined;
    const suggestions = (source['suggestions'] ?? source['Suggestions']) as string[] | undefined;

    return {
      isError,
      provider,
      model,
      answer,
      executedTool,
      arguments: argumentsValue,
      data,
      stderr,
      warnings,
      suggestions,
    };
  }

  private buildHistory(): McpChatHistoryItem[] {
    return this.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-20)
      .map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.text,
      }));
  }

  private pushMessage(
    role: ChatRole,
    text: string,
    data?: unknown,
    suggestions?: string[],
    provider?: string,
    model?: string
  ): void {
    this.messages = [
      ...this.messages,
      {
        role,
        text,
        provider,
        model,
        data,
        suggestions,
        timestamp: new Date(),
      },
    ];
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const node = this.scrollContainer?.nativeElement;
      if (node) {
        node.scrollTop = node.scrollHeight;
      }
    }, 0);
  }

  private extractHttpError(error: HttpErrorResponse): unknown {
    if (error.error) {
      return error.error;
    }
    return {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
    };
  }
}
