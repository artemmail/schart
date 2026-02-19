import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { EChartsOption } from 'echarts';
import { MaterialModule } from 'src/app/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  McpChatResponse,
  McpConsoleService,
  McpConversationDetails,
  McpConversationMessageView,
  McpConversationSummary,
  McpProviderResponse,
} from 'src/app/service/mcp-console.service';
import {
  MarkdownRendererService,
  McpChartErrorParsedBlock,
  McpChartLinkParsedBlock,
  McpChartParsedBlock,
  McpMarkdownParsedBlock,
  McpParsedBlock,
} from 'src/app/service/markdown-renderer.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { McpChartRendererService } from 'src/app/service/mcp-chart-renderer.service';
import { McpChartLinkBuilderService } from 'src/app/service/mcp-chart-link-builder.service';

type ChatRole = 'user' | 'assistant' | 'system' | 'error';

interface ChatRenderBlockMarkdown {
  kind: 'markdown';
  renderedHtml: SafeHtml;
}

interface ChatRenderBlockChart {
  kind: 'chart';
  chartType: 'bar' | 'pie';
  title?: string;
  subtitle?: string;
  source?: string;
  options: EChartsOption;
}

interface ChatRenderBlockChartLink {
  kind: 'chart_link';
  chartType: 'candlestick';
  title?: string;
  subtitle?: string;
  label: string;
  url: string;
  ticker: string;
}

interface ChatRenderBlockError {
  kind: 'chart_error';
  reason: string;
  rawBlock: string;
  language: string;
}

type ChatRenderBlock =
  | ChatRenderBlockMarkdown
  | ChatRenderBlockChart
  | ChatRenderBlockChartLink
  | ChatRenderBlockError;

interface ChatMessage {
  id?: number;
  role: ChatRole;
  timestamp: Date;
  text: string;
  renderBlocks?: ChatRenderBlock[];
  provider?: string;
  model?: string;
  data?: unknown;
  trace?: OpenAiTraceStep[];
  suggestions?: string[];
  detailsExpanded?: boolean;
  traceExpanded?: boolean;
}

interface ConversationItem {
  id: string;
  title: string;
  lastMessagePreview: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface OpenAiTraceToolResult {
  id: string;
  tool: string;
  isError: boolean;
  error?: string;
  arguments?: unknown;
}

interface OpenAiTraceStep {
  phase: string;
  iteration?: number;
  status: string;
  finishReason?: string;
  errorText?: string;
  toolCallCount?: number;
  tools: string[];
  assistantTextPreview?: string;
  toolResults: OpenAiTraceToolResult[];
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

  readonly defaultConversationTitle = 'Новый диалог';
  messages: ChatMessage[] = [];
  conversations: ConversationItem[] = [];
  userInput = '';
  activeConversationId: string | null = null;
  activeConversationTitle = this.defaultConversationTitle;

  loadingConversations = false;
  loadingConversation = false;
  sending = false;
  mobileSidebarOpen = false;

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
    private readonly titleService: Title,
    private readonly markdownRenderer: MarkdownRendererService,
    private readonly chartRenderer: McpChartRendererService,
    private readonly chartLinkBuilder: McpChartLinkBuilderService,
    private readonly sanitizer: DomSanitizer,
    private readonly snackBar: MatSnackBar,
    private readonly dialogService: DialogService
  ) {
    this.titleService.setTitle('MCP Console');
  }

  ngOnInit(): void {
    this.loadProviderInfo();
    this.loadConversations();
  }

  sendMessage(): void {
    const message = (this.userInput || '').trim();
    if (!message || this.sending) {
      return;
    }

    this.userInput = '';
    this.pushMessage('user', message);
    this.sending = true;

    this.mcpService.chat(message, this.activeConversationId).subscribe({
      next: (response: McpChatResponse) => {
        const normalized = this.normalizeChatResponse(response);
        this.updateProviderFromChatResponse(normalized);

        const conversationId = normalized.conversationId || this.activeConversationId;
        if (conversationId) {
          this.activeConversationId = conversationId;
        }
        if (normalized.conversationTitle) {
          this.activeConversationTitle = normalized.conversationTitle;
        }

        const details = this.buildDetailsPayload(normalized);
        this.pushMessage(
          normalized.isError ? 'error' : 'assistant',
          normalized.answer,
          details,
          normalized.trace as OpenAiTraceStep[] | undefined,
          normalized.suggestions,
          normalized.provider || this.providerName,
          normalized.model || this.providerModel
        );
        this.loadConversations(this.activeConversationId, false);
      },
      error: (error: HttpErrorResponse) => {
        this.sending = false;
        if (this.isSubscriptionRequiredError(error)) {
          this.showSubscriptionRequiredDialog(error);
          this.pushMessage(
            'error',
            'Для отправки запросов в MCP Console нужна активная подписка.',
            this.extractHttpError(error)
          );
          return;
        }

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

  startNewConversation(): void {
    this.mobileSidebarOpen = false;
    this.activeConversationId = null;
    this.activeConversationTitle = this.defaultConversationTitle;
    this.messages = [];
    this.pushWelcomeMessage();
  }

  openConversation(conversationId: string): void {
    if (this.loadingConversation || this.activeConversationId === conversationId) {
      this.mobileSidebarOpen = false;
      return;
    }

    this.loadingConversation = true;
    this.mcpService.getConversation(conversationId).subscribe({
      next: (conversation: McpConversationDetails) => {
        const normalized = this.normalizeConversationDetails(conversation);
        this.activeConversationId = normalized.id;
        this.activeConversationTitle = normalized.title;
        this.messages = normalized.messages.map((message) =>
          this.mapStoredMessageToChatMessage(message)
        );
        if (this.messages.length === 0) {
          this.pushWelcomeMessage();
        } else {
          this.scrollToBottom();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.pushMessage(
          'error',
          'Не удалось загрузить диалог.',
          this.extractHttpError(error)
        );
      },
      complete: () => {
        this.loadingConversation = false;
        this.mobileSidebarOpen = false;
      },
    });
  }

  toggleSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  toggleMessageDetails(message: ChatMessage): void {
    message.detailsExpanded = !message.detailsExpanded;
  }

  toggleMessageTrace(message: ChatMessage): void {
    message.traceExpanded = !message.traceExpanded;
  }

  hasOpenAiTrace(message: ChatMessage): boolean {
    return !!message.trace && message.trace.length > 0;
  }

  copyMessage(message: ChatMessage): void {
    const text = (message.text || '').trim();
    if (!text) {
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => this.snackBar.open('Скопировано', '', { duration: 1200 }))
      .catch(() =>
        this.snackBar.open('Не удалось скопировать в буфер обмена', 'OK', {
          duration: 2200,
        })
      );
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

  get hasConversationItems(): boolean {
    return this.conversations.length > 0;
  }

  formatConversationTime(value?: Date): string {
    if (!value) {
      return '';
    }

    return value.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private loadConversations(
    preferredConversationId?: string | null,
    reloadMessages = true
  ): void {
    this.loadingConversations = true;
    this.mcpService.getConversations().subscribe({
      next: (items: McpConversationSummary[]) => {
        this.conversations = (items || [])
          .map((item) => this.normalizeConversationSummary(item))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        const targetConversationId = preferredConversationId ?? this.activeConversationId;
        if (targetConversationId) {
          const exists = this.conversations.some((item) => item.id === targetConversationId);
          if (exists) {
            if (reloadMessages) {
              this.openConversation(targetConversationId);
            } else {
              const active = this.conversations.find((item) => item.id === targetConversationId);
              if (active) {
                this.activeConversationTitle = active.title;
              }
            }
            return;
          }
        }

        if (this.conversations.length > 0) {
          this.openConversation(this.conversations[0].id);
          return;
        }

        this.startNewConversation();
      },
      error: () => {
        this.startNewConversation();
      },
      complete: () => {
        this.loadingConversations = false;
      },
    });
  }

  private pushWelcomeMessage(): void {
    this.pushMessage(
      'assistant',
      'MCP chat готов. Выберите диалог слева или начните новый. Поддерживаются команды `/help`, `/tools`, `/tool`, `/rpc`.'
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
    const providerRunId = (
      source['providerRunId'] ?? source['ProviderRunId']
    ) as string | undefined;
    const providerConversationId = (
      source['providerConversationId'] ?? source['ProviderConversationId']
    ) as string | undefined;
    const orchestratorPhase = (
      source['orchestratorPhase'] ?? source['OrchestratorPhase']
    ) as string | undefined;
    const orchestratorWarnings = (
      source['orchestratorWarnings'] ?? source['OrchestratorWarnings']
    ) as string[] | undefined;
    const conversationId = (
      source['conversationId'] ?? source['ConversationId']
    ) as string | undefined;
    const conversationTitle = (
      source['conversationTitle'] ?? source['ConversationTitle']
    ) as string | undefined;
    const answerValue = (source['answer'] ?? source['Answer'] ?? '') as unknown;
    const answer = typeof answerValue === 'string' ? answerValue : JSON.stringify(answerValue);
    const executedTool = (source['executedTool'] ?? source['ExecutedTool']) as string | undefined;
    const argumentsValue = source['arguments'] ?? source['Arguments'];
    const data = source['data'] ?? source['Data'];
    const traceRaw = source['trace'] ?? source['Trace'];
    const stderr = (source['stderr'] ?? source['Stderr']) as string | undefined;
    const warnings = (source['warnings'] ?? source['Warnings']) as string[] | undefined;
    const suggestions = (source['suggestions'] ?? source['Suggestions']) as string[] | undefined;

    return {
      isError,
      provider,
      model,
      providerRunId,
      providerConversationId,
      orchestratorPhase,
      orchestratorWarnings,
      conversationId,
      conversationTitle,
      answer,
      executedTool,
      arguments: argumentsValue,
      data,
      trace: this.normalizeOpenAiTrace(traceRaw),
      stderr,
      warnings,
      suggestions,
    };
  }

  private pushMessage(
    role: ChatRole,
    text: string,
    data?: unknown,
    trace?: OpenAiTraceStep[],
    suggestions?: string[],
    provider?: string,
    model?: string
  ): void {
    this.messages = [
      ...this.messages,
      this.buildChatMessage(role, text, new Date(), data, trace, suggestions, provider, model),
    ];
    this.scrollToBottom();
  }

  private buildChatMessage(
    role: ChatRole,
    text: string,
    timestamp: Date,
    data?: unknown,
    trace?: OpenAiTraceStep[],
    suggestions?: string[],
    provider?: string,
    model?: string,
    id?: number
  ): ChatMessage {
    return {
      id,
      role,
      text,
      renderBlocks: role === 'user' ? undefined : this.buildRenderBlocks(text || ''),
      provider,
      model,
      data,
      trace,
      suggestions,
      timestamp,
      detailsExpanded: false,
      traceExpanded: false,
    };
  }

  private renderMarkdownBlock(text: string): SafeHtml {
    const html = this.markdownRenderer.renderMath(text || '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private buildRenderBlocks(text: string): ChatRenderBlock[] {
    const parsedBlocks = this.markdownRenderer.extractBlocks(text);
    if (!parsedBlocks || parsedBlocks.length === 0) {
      return [
        {
          kind: 'markdown',
          renderedHtml: this.renderMarkdownBlock(text),
        },
      ];
    }

    const blocks: ChatRenderBlock[] = [];
    for (const parsed of parsedBlocks) {
      const rendered = this.mapParsedBlockToRenderBlock(parsed);
      if (rendered) {
        blocks.push(rendered);
      }
    }

    if (blocks.length === 0) {
      blocks.push({
        kind: 'markdown',
        renderedHtml: this.renderMarkdownBlock(text),
      });
    }

    return blocks;
  }

  private mapParsedBlockToRenderBlock(parsed: McpParsedBlock): ChatRenderBlock | null {
    if (this.isMarkdownParsedBlock(parsed)) {
      if (!parsed.markdown) {
        return null;
      }

      return {
        kind: 'markdown',
        renderedHtml: this.renderMarkdownBlock(parsed.markdown),
      };
    }

    if (this.isChartParsedBlock(parsed)) {
      try {
        return {
          kind: 'chart',
          chartType: parsed.spec.type,
          title: parsed.spec.title,
          subtitle: parsed.spec.subtitle,
          source: parsed.spec.source,
          options: this.chartRenderer.build(parsed.spec),
        };
      } catch {
        return {
          kind: 'chart_error',
          reason: 'Не удалось построить chart options.',
          rawBlock: parsed.rawBlock,
          language: parsed.spec.type,
        };
      }
    }

    if (this.isChartLinkParsedBlock(parsed)) {
      try {
        return {
          kind: 'chart_link',
          chartType: 'candlestick',
          title: parsed.spec.title,
          subtitle: parsed.spec.subtitle,
          label: parsed.spec.linkLabel || 'Открыть свечной график',
          url: this.chartLinkBuilder.buildCandlestickUrl(parsed.spec),
          ticker: parsed.spec.ticker,
        };
      } catch {
        return {
          kind: 'chart_error',
          reason: 'Не удалось сформировать ссылку candlestick.',
          rawBlock: parsed.rawBlock,
          language: 'candlestick',
        };
      }
    }

    if (this.isChartErrorParsedBlock(parsed)) {
      return {
        kind: 'chart_error',
        reason: parsed.reason || 'Ошибка парсинга chart-блока.',
        rawBlock: parsed.rawBlock,
        language: parsed.language,
      };
    }

    return {
      kind: 'chart_error',
      reason: 'Ошибка парсинга chart-блока.',
      rawBlock: '',
      language: 'chart',
    };
  }

  private isMarkdownParsedBlock(block: McpParsedBlock): block is McpMarkdownParsedBlock {
    return block.type === 'markdown';
  }

  private isChartParsedBlock(block: McpParsedBlock): block is McpChartParsedBlock {
    return block.type === 'chart';
  }

  private isChartLinkParsedBlock(block: McpParsedBlock): block is McpChartLinkParsedBlock {
    return block.type === 'chart_link';
  }

  private isChartErrorParsedBlock(block: McpParsedBlock): block is McpChartErrorParsedBlock {
    return block.type === 'chart_error';
  }

  isMarkdownBlock(block: ChatRenderBlock): block is ChatRenderBlockMarkdown {
    return block.kind === 'markdown';
  }

  isChartBlock(block: ChatRenderBlock): block is ChatRenderBlockChart {
    return block.kind === 'chart';
  }

  isChartLinkBlock(block: ChatRenderBlock): block is ChatRenderBlockChartLink {
    return block.kind === 'chart_link';
  }

  isChartErrorBlock(block: ChatRenderBlock): block is ChatRenderBlockError {
    return block.kind === 'chart_error';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const node = this.scrollContainer?.nativeElement;
      if (node) {
        node.scrollTop = node.scrollHeight;
      }
    }, 0);
  }

  private normalizeConversationSummary(raw: unknown): ConversationItem {
    const source = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(source['id'] ?? source['Id'] ?? ''),
      title: String(source['title'] ?? source['Title'] ?? this.defaultConversationTitle),
      lastMessagePreview: String(
        source['lastMessagePreview'] ?? source['LastMessagePreview'] ?? ''
      ),
      lastMessageAt: this.parseDate(source['lastMessageAt'] ?? source['LastMessageAt']),
      createdAt: this.parseDate(source['createdAt'] ?? source['CreatedAt']) || new Date(),
      updatedAt: this.parseDate(source['updatedAt'] ?? source['UpdatedAt']) || new Date(),
      messageCount: Number(source['messageCount'] ?? source['MessageCount'] ?? 0),
    };
  }

  private normalizeConversationDetails(raw: unknown): {
    id: string;
    title: string;
    messages: McpConversationMessageView[];
  } {
    const source = (raw ?? {}) as Record<string, unknown>;
    const id = String(source['id'] ?? source['Id'] ?? '');
    const title = String(source['title'] ?? source['Title'] ?? this.defaultConversationTitle);
    const messagesRaw = (source['messages'] ?? source['Messages'] ?? []) as unknown[];
    const messages = (messagesRaw || []).map((item) =>
      this.normalizeStoredConversationMessage(item)
    );

    return { id, title, messages };
  }

  private normalizeStoredConversationMessage(raw: unknown): McpConversationMessageView {
    const source = (raw ?? {}) as Record<string, unknown>;
    return {
      id: Number(source['id'] ?? source['Id'] ?? 0),
      role: String(source['role'] ?? source['Role'] ?? 'assistant'),
      text: String(source['text'] ?? source['Text'] ?? ''),
      provider: (source['provider'] ?? source['Provider']) as string | undefined,
      model: (source['model'] ?? source['Model']) as string | undefined,
      providerMessageId: (source['providerMessageId'] ?? source['ProviderMessageId']) as
        | string
        | undefined,
      isError: Boolean(source['isError'] ?? source['IsError'] ?? false),
      data: source['data'] ?? source['Data'],
      suggestions: (source['suggestions'] ?? source['Suggestions']) as string[] | undefined,
      timestamp: String(source['timestamp'] ?? source['Timestamp'] ?? new Date().toISOString()),
    };
  }

  private mapStoredMessageToChatMessage(message: McpConversationMessageView): ChatMessage {
    const role = this.mapStoredRole(message.role, message.isError);
    const trace = this.extractTraceFromData(message.data);
    return this.buildChatMessage(
      role,
      message.text,
      this.parseDate(message.timestamp) || new Date(),
      message.data,
      trace,
      message.suggestions,
      message.provider,
      message.model,
      message.id
    );
  }

  private mapStoredRole(role: string, isError: boolean): ChatRole {
    if (isError || role === 'error') {
      return 'error';
    }
    if (role === 'system') {
      return 'system';
    }
    if (role === 'user') {
      return 'user';
    }
    return 'assistant';
  }

  private parseDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date;
  }

  private normalizeOpenAiTrace(value: unknown): OpenAiTraceStep[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const trace = (value as unknown[])
      .map((item) => this.normalizeOpenAiTraceStep(item))
      .filter((item): item is OpenAiTraceStep => !!item);

    return trace.length > 0 ? trace : undefined;
  }

  private normalizeOpenAiTraceStep(value: unknown): OpenAiTraceStep | undefined {
    const source = (value ?? {}) as Record<string, unknown>;
    const toolsRaw = source['tools'];
    const toolResultsRaw = source['toolResults'] ?? source['tool_results'];

    const tools = Array.isArray(toolsRaw)
      ? toolsRaw.map((tool) => String(tool ?? '').trim()).filter((tool) => !!tool)
      : [];

    const toolResults = Array.isArray(toolResultsRaw)
      ? toolResultsRaw
          .map((item) => this.normalizeOpenAiTraceToolResult(item))
          .filter((item): item is OpenAiTraceToolResult => !!item)
      : [];

    const phase = String(source['phase'] ?? 'iteration');
    const status = String(source['status'] ?? 'ok');
    const iterationRaw = source['iteration'];
    const iteration =
      typeof iterationRaw === 'number' && Number.isFinite(iterationRaw) ? iterationRaw : undefined;
    const finishReasonValue = source['finishReason'] ?? source['finish_reason'];
    const finishReason =
      typeof finishReasonValue === 'string' && finishReasonValue.trim()
        ? finishReasonValue.trim()
        : undefined;
    const toolCallCountRaw = source['toolCallCount'] ?? source['tool_call_count'];
    const toolCallCount =
      typeof toolCallCountRaw === 'number' && Number.isFinite(toolCallCountRaw)
        ? toolCallCountRaw
        : undefined;
    const assistantTextPreviewValue =
      source['assistantTextPreview'] ?? source['assistant_text_preview'];
    const assistantTextPreview =
      typeof assistantTextPreviewValue === 'string' && assistantTextPreviewValue.trim()
        ? assistantTextPreviewValue.trim()
        : undefined;
    const errorText = this.extractTraceErrorText(source['error']);
    const hasError = source['error'] !== undefined;

    if (
      !tools.length &&
      !toolResults.length &&
      !assistantTextPreview &&
      iteration === undefined &&
      !hasError &&
      !finishReason
    ) {
      return undefined;
    }

    return {
      phase,
      iteration,
      status,
      finishReason,
      errorText,
      toolCallCount,
      tools,
      assistantTextPreview,
      toolResults,
    };
  }

  private extractTraceErrorText(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      return text || undefined;
    }

    if (typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const details =
        source['details'] && typeof source['details'] === 'object'
          ? (source['details'] as Record<string, unknown>)
          : undefined;
      const messageCandidate =
        source['message'] ??
        details?.['message'] ??
        (source['error'] as Record<string, unknown> | undefined)?.['message'];

      const statusCodeCandidate = details?.['statusCode'];
      const statusCode =
        typeof statusCodeCandidate === 'number' || typeof statusCodeCandidate === 'string'
          ? String(statusCodeCandidate)
          : undefined;

      if (typeof messageCandidate === 'string' && messageCandidate.trim()) {
        const message = messageCandidate.trim();
        return statusCode ? `${message} (status: ${statusCode})` : message;
      }

      try {
        const serialized = JSON.stringify(source);
        if (!serialized) {
          return undefined;
        }

        return serialized.length > 240 ? `${serialized.slice(0, 240)}...` : serialized;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private normalizeOpenAiTraceToolResult(value: unknown): OpenAiTraceToolResult | undefined {
    const source = (value ?? {}) as Record<string, unknown>;
    const idValue = source['id'];
    const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim() : '';
    const toolValue = source['tool'];
    const tool = typeof toolValue === 'string' && toolValue.trim() ? toolValue.trim() : '';
    const isError = Boolean(source['isError'] ?? source['is_error'] ?? false);
    const errorValue = source['error'];
    const error =
      typeof errorValue === 'string' && errorValue.trim() ? errorValue.trim() : undefined;
    const argumentsPayload = source['arguments'];

    if (!id && !tool && !error) {
      return undefined;
    }

    return {
      id,
      tool,
      isError,
      error,
      arguments: argumentsPayload,
    };
  }

  private extractTraceFromData(data: unknown): OpenAiTraceStep[] | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }

    const source = data as Record<string, unknown>;
    return this.normalizeOpenAiTrace(source['trace'] ?? source['Trace']);
  }

  private buildDetailsPayload(response: McpChatResponse): unknown {
    const details: Record<string, unknown> = {};

    if (response.executedTool) {
      details['executedTool'] = response.executedTool;
    }
    if (response.arguments !== undefined) {
      details['arguments'] = response.arguments;
    }
    if (response.data !== undefined) {
      details['data'] = response.data;
    }
    if (response.trace !== undefined) {
      details['trace'] = response.trace;
    }
    if (response.stderr) {
      details['stderr'] = response.stderr;
    }
    if (response.warnings && response.warnings.length > 0) {
      details['warnings'] = response.warnings;
    }

    return Object.keys(details).length > 0 ? details : undefined;
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

  private isSubscriptionRequiredError(error: HttpErrorResponse): boolean {
    if (error.status !== 403) {
      return false;
    }

    const payload = error.error;
    if (payload && typeof payload === 'object') {
      const source = payload as Record<string, unknown>;
      const code = source['code'];
      if (typeof code === 'string' && code.trim().toLowerCase() === 'subscription_required') {
        return true;
      }
    }

    return false;
  }

  private showSubscriptionRequiredDialog(error: HttpErrorResponse): void {
    const payload = error.error && typeof error.error === 'object'
      ? (error.error as Record<string, unknown>)
      : null;
    const paymentUrlRaw = payload?.['paymentUrl'];
    const paymentUrl =
      typeof paymentUrlRaw === 'string' && paymentUrlRaw.trim()
        ? paymentUrlRaw.trim()
        : '/Payment';

    const message =
      `Для работы с MCP Console нужна активная подписка.<br>` +
      `<a href="${paymentUrl}">Перейти к тарифам</a>`;

    this.dialogService.info(message).subscribe();
  }
}
