import { describe, it, expect, vi } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_key';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  }))
}));
import { sanitizeSlug, parseAiJson } from '../src/app/api/cron/auto-blog/route';

describe('Auto Blog Cron Utilities', () => {
  describe('sanitizeSlug', () => {
    it('should convert text to lowercase and replace spaces with hyphens', () => {
      expect(sanitizeSlug('Hello World')).toBe('hello-world');
    });

    it('should handle Turkish characters correctly', () => {
      expect(sanitizeSlug('Fıstıklı Şeker Pare')).toBe('fistikli-seker-pare');
      expect(sanitizeSlug('Çilekli Öğle Tatlısı')).toBe('cilekli-ogle-tatlisi');
    });

    it('should handle German characters correctly', () => {
      expect(sanitizeSlug('Käsekuchen mit süßem Kaffee')).toBe('kasekuchen-mit-sussem-kaffee');
    });

    it('should remove special characters', () => {
      expect(sanitizeSlug('Best! 100% (New) Recipes')).toBe('best-100-new-recipes');
    });

    it('should handle empty input by returning a timestamp slug', () => {
      const slug = sanitizeSlug('');
      expect(slug).toMatch(/^blog-\d+$/);
    });
  });

  describe('parseAiJson', () => {
    it('should parse valid JSON', () => {
      const input = '{"title": "Test Title", "content": "Test Content"}';
      const parsed = parseAiJson(input);
      expect(parsed).toEqual({ title: 'Test Title', content: 'Test Content' });
    });

    it('should remove <think> blocks and parse JSON', () => {
      const input = '<think>I should write a JSON</think>{"title": "Test Title"}';
      const parsed = parseAiJson(input);
      expect(parsed).toEqual({ title: 'Test Title' });
    });

    it('should strip markdown backticks and parse JSON', () => {
      const input = '```json\n{"title": "Test"}\n```';
      const parsed = parseAiJson(input);
      expect(parsed).toEqual({ title: 'Test' });
    });

    it('should throw an error for invalid JSON', () => {
      const input = 'This is not JSON';
      expect(() => parseAiJson(input)).toThrow('Failed to parse AI output as JSON.');
    });
  });
});
