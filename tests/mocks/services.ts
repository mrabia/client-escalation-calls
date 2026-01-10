/**
 * Mock Service Implementations
 * Mock implementations of external services for testing
 */

export class MockOpenAIClient {
  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response from GPT-4',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  };

  embeddings = {
    create: jest.fn().mockResolvedValue({
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: Array(1536).fill(0).map(() => Math.random()),
          index: 0,
        },
      ],
      model: 'text-embedding-3-small',
      usage: {
        prompt_tokens: 8,
        total_tokens: 8,
      },
    }),
  };
}

export class MockAnthropicClient {
  messages = {
    create: jest.fn().mockResolvedValue({
      id: 'msg-123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from Claude',
        },
      ],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    }),
  };
}

export class MockQdrantClient {
  private collections: Map<string, any[]> = new Map();

  getCollections = jest.fn().mockResolvedValue({
    collections: [],
  });

  createCollection = jest.fn().mockImplementation(async (collectionName: string, config: any) => {
    this.collections.set(collectionName, []);
    return { status: 'ok' };
  });

  upsert = jest.fn().mockImplementation(async (collectionName: string, data: any) => {
    const collection = this.collections.get(collectionName) || [];
    collection.push(...data.points);
    this.collections.set(collectionName, collection);
    return { status: 'ok' };
  });

  search = jest.fn().mockImplementation(async (collectionName: string, query: any) => {
    const collection = this.collections.get(collectionName) || [];
    // Return mock search results
    return collection.slice(0, query.limit || 5).map((point, index) => ({
      id: point.id,
      score: 0.9 - index * 0.1,
      payload: point.payload,
      vector: point.vector,
    }));
  });

  delete = jest.fn().mockResolvedValue({ status: 'ok' });

  retrieve = jest.fn().mockImplementation(async (collectionName: string, ids: string[]) => {
    const collection = this.collections.get(collectionName) || [];
    return ids.map(id => collection.find(point => point.id === id)).filter(Boolean);
  });
}

export class MockRedisClient {
  private store: Map<string, any> = new Map();

  get = jest.fn().mockImplementation(async (key: string) => {
    return this.store.get(key) || null;
  });

  set = jest.fn().mockImplementation(async (key: string, value: any, options?: any) => {
    this.store.set(key, value);
    return 'OK';
  });

  del = jest.fn().mockImplementation(async (...keys: string[]) => {
    let count = 0;
    keys.forEach(key => {
      if (this.store.delete(key)) count++;
    });
    return count;
  });

  keys = jest.fn().mockImplementation(async (pattern: string) => {
    return Array.from(this.store.keys()).filter(key => 
      key.match(new RegExp(pattern.replace('*', '.*')))
    );
  });

  exists = jest.fn().mockImplementation(async (...keys: string[]) => {
    return keys.filter(key => this.store.has(key)).length;
  });

  expire = jest.fn().mockResolvedValue(1);

  ttl = jest.fn().mockResolvedValue(1800);
}

export class MockDatabaseClient {
  query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  
  connect = jest.fn().mockResolvedValue(undefined);
  
  end = jest.fn().mockResolvedValue(undefined);
}

export class MockSMTPClient {
  sendMail = jest.fn().mockResolvedValue({
    messageId: '<mock-message-id@example.com>',
    accepted: ['recipient@example.com'],
    rejected: [],
    response: '250 Message accepted',
  });

  verify = jest.fn().mockResolvedValue(true);
}

export class MockTwilioClient {
  messages = {
    create: jest.fn().mockResolvedValue({
      sid: 'SM' + Math.random().toString(36).substring(7),
      status: 'sent',
      to: '+1234567890',
      from: '+0987654321',
      body: 'Test message',
    }),
  };

  calls = {
    create: jest.fn().mockResolvedValue({
      sid: 'CA' + Math.random().toString(36).substring(7),
      status: 'initiated',
      to: '+1234567890',
      from: '+0987654321',
    }),
  };
}
