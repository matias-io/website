export interface TrustedDocument {
  key: string;
  title: string;
  kind: 'page' | 'note';
  href?: string;
  contentHash: string;
}

export interface SearchChunk {
  id: string;
  text: string;
  score: number;
  item?: { key: string; metadata?: Record<string, unknown> };
}

export interface KnowledgeBinding {
  search(input: {
    query: string;
    ai_search_options: {
      retrieval: {
        retrieval_type: 'hybrid';
        max_num_results: number;
        match_threshold: number;
        return_on_failure: false;
      };
      query_rewrite: { enabled: false };
      reranking: { enabled: false };
      cache: { enabled: false };
    };
  }): Promise<{ chunks: SearchChunk[] }>;
}

export interface WorkerEnv {
  ASSETS: Fetcher;
  AI?: Ai;
  KNOWLEDGE?: KnowledgeBinding;
  CHAT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  CHAT_ENABLED?: string;
  ENVIRONMENT?: string;
  ALLOWED_HOSTNAMES?: string;
  AI_GATEWAY_ID?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_EMAIL?: SendEmail;
  CONTACT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  CONTACT_ENABLED?: string;
  CONTACT_FROM?: string;
  CONTACT_RECIPIENT?: string;
}
