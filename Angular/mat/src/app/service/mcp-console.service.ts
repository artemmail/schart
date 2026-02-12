import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

export interface McpToolPropertySchema {
  type?: string | string[];
  default?: unknown;
  description?: string;
}

export interface McpToolInputSchema {
  required?: string[];
  properties?: Record<string, McpToolPropertySchema>;
}

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: McpToolInputSchema;
}

export interface McpToolsResponse {
  tools: McpToolDefinition[];
  stderr?: string;
  warnings?: string[];
}

export interface McpToolCallResponse {
  tool: string;
  isError: boolean;
  payload: unknown;
  rpc?: unknown;
  stderr?: string;
  warnings?: string[];
}

export interface McpRpcResponse {
  rpc: unknown;
  stderr?: string;
  warnings?: string[];
}

export interface McpProviderResponse {
  provider: string;
  openAi?: {
    enabled?: boolean;
    model?: string;
    baseUrl?: string;
    apiMode?: string;
    useConversationsApi?: boolean;
    reasoningEffort?: string;
    hasApiKey?: boolean;
    apiKeyEnvVar?: string;
  };
}

export interface McpChatHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface McpChatResponse {
  isError: boolean;
  provider?: string;
  model?: string;
  providerRunId?: string;
  providerConversationId?: string;
  orchestratorPhase?: string;
  orchestratorWarnings?: string[];
  conversationId?: string;
  conversationTitle?: string;
  answer: string;
  executedTool?: string;
  arguments?: unknown;
  data?: unknown;
  trace?: unknown;
  stderr?: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface McpConversationSummary {
  id: string;
  title: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface McpConversationMessageView {
  id: number;
  role: string;
  text: string;
  provider?: string;
  model?: string;
  providerMessageId?: string;
  isError: boolean;
  data?: unknown;
  suggestions?: string[];
  timestamp: string;
}

export interface McpConversationDetails {
  id: string;
  title: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  providerApiMode?: string;
  providerConversationId?: string;
  providerLastResponseId?: string;
  messages: McpConversationMessageView[];
}

@Injectable({
  providedIn: 'root',
})
export class McpConsoleService {
  private readonly baseUrl = `${environment.apiUrl}/api/mcp`;

  constructor(private http: HttpClient) {}

  getProvider(): Observable<McpProviderResponse> {
    return this.http.get<McpProviderResponse>(`${this.baseUrl}/provider`, {
      withCredentials: true,
    });
  }

  getTools(): Observable<McpToolsResponse> {
    return this.http.get<McpToolsResponse>(`${this.baseUrl}/tools`, {
      withCredentials: true,
    });
  }

  callTool(
    tool: string,
    argumentsPayload: Record<string, unknown>
  ): Observable<McpToolCallResponse> {
    return this.http.post<McpToolCallResponse>(
      `${this.baseUrl}/tool-call`,
      {
        tool,
        arguments: argumentsPayload,
      },
      {
        withCredentials: true,
      }
    );
  }

  rpc(method: string, paramsPayload: unknown): Observable<McpRpcResponse> {
    return this.http.post<McpRpcResponse>(
      `${this.baseUrl}/rpc`,
      {
        method,
        params: paramsPayload,
      },
      {
        withCredentials: true,
      }
    );
  }

  getConversations(): Observable<McpConversationSummary[]> {
    return this.http.get<McpConversationSummary[]>(
      `${this.baseUrl}/conversations`,
      {
        withCredentials: true,
      }
    );
  }

  getConversation(conversationId: string): Observable<McpConversationDetails> {
    return this.http.get<McpConversationDetails>(
      `${this.baseUrl}/conversations/${conversationId}`,
      {
        withCredentials: true,
      }
    );
  }

  createConversation(title?: string): Observable<McpConversationSummary> {
    return this.http.post<McpConversationSummary>(
      `${this.baseUrl}/conversations`,
      { title },
      {
        withCredentials: true,
      }
    );
  }

  chat(
    message: string,
    conversationId?: string | null,
    history: McpChatHistoryItem[] = []
  ): Observable<McpChatResponse> {
    return this.http.post<McpChatResponse>(
      `${this.baseUrl}/chat`,
      {
        message,
        conversationId,
        history,
      },
      {
        withCredentials: true,
      }
    );
  }
}
