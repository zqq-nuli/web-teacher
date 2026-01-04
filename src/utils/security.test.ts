import { describe, it, expect } from 'vitest';
import { RateLimiter, sanitizeText, isValidUrl, isValidApiKey } from './security';

describe('RateLimiter', () => {
  it('should allow immediate first call', () => {
    const limiter = new RateLimiter(1000);
    expect(limiter.canCall()).toBe(true);
  });

  it('should return correct wait time', async () => {
    const limiter = new RateLimiter(100);
    await limiter.throttle(() => Promise.resolve());

    const waitTime = limiter.getWaitTime();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(100);
  });

  it('should throttle calls', async () => {
    const limiter = new RateLimiter(50);
    const start = Date.now();

    await limiter.throttle(() => Promise.resolve());
    await limiter.throttle(() => Promise.resolve());

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});

describe('sanitizeText', () => {
  it('should return default value for non-string input', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText(null, { defaultValue: 'default' })).toBe('default');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('should remove script tags', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    expect(sanitizeText(input)).toBe('Hello  World');
  });

  it('should remove event handlers', () => {
    const input = '<div onclick="alert(1)">test</div>';
    expect(sanitizeText(input)).toBe('<div "alert(1)">test</div>');
  });

  it('should remove javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">link</a>';
    expect(sanitizeText(input)).toBe('<a href="alert(1)">link</a>');
  });

  it('should truncate long text', () => {
    const longText = 'a'.repeat(200);
    const result = sanitizeText(longText, { maxLength: 100 });
    expect(result.length).toBe(103); // 100 + "..."
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('isValidUrl', () => {
  it('should accept valid https URLs', () => {
    expect(isValidUrl('https://api.openai.com/v1')).toBe(true);
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('should accept valid http URLs', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('isValidApiKey', () => {
  it('should validate OpenAI API keys', () => {
    expect(isValidApiKey('sk-1234567890abcdefghijklmno', 'openai')).toBe(true);
    expect(isValidApiKey('sk-short', 'openai')).toBe(false);
    expect(isValidApiKey('invalid-key', 'openai')).toBe(false);
    expect(isValidApiKey('', 'openai')).toBe(false);
  });

  it('should validate Anthropic API keys', () => {
    expect(isValidApiKey('sk-ant-1234567890abcdefghij', 'anthropic')).toBe(true);
    expect(isValidApiKey('sk-ant-short', 'anthropic')).toBe(false);
    expect(isValidApiKey('sk-1234567890', 'anthropic')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidApiKey(null as unknown as string, 'openai')).toBe(false);
    expect(isValidApiKey(undefined as unknown as string, 'openai')).toBe(false);
  });
});
