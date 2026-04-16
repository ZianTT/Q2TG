import fs from 'fs';
import dataPath from './dataPath';
import env from '../models/env';

const CHECK_INTERVAL_MS = 5000;

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class Tg2qWordFilter {
  private readonly dictionaryPath = env.TG2Q_BLOCK_WORDS_PATH || dataPath('tg2q-block-words.txt');
  private lastCheckAt = 0;
  private mtimeMs = -1;
  private pattern: RegExp | null = null;

  private refreshIfNeeded() {
    const now = Date.now();
    if (now - this.lastCheckAt < CHECK_INTERVAL_MS) {
      return;
    }
    this.lastCheckAt = now;

    try {
      const stats = fs.statSync(this.dictionaryPath);
      if (!stats.isFile()) {
        this.pattern = null;
        this.mtimeMs = -1;
        return;
      }
      if (stats.mtimeMs === this.mtimeMs) {
        return;
      }

      const keywords = fs.readFileSync(this.dictionaryPath, 'utf-8')
        .split(/\r?\n/)
        .map(it => it.trim())
        .filter(it => it && !it.startsWith('#'));

      const escapedKeywords = [...new Set(keywords)]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp);

      this.pattern = escapedKeywords.length ? new RegExp(escapedKeywords.join('|'), 'g') : null;
      this.mtimeMs = stats.mtimeMs;
    }
    catch {
      this.pattern = null;
      this.mtimeMs = -1;
    }
  }

  public mask(text: string) {
    if (!text) return text;
    this.refreshIfNeeded();
    return this.pattern ? text.replace(this.pattern, (matched) => '*'.repeat(matched.length)) : text;
  }

  public maskChain<T>(chain: T[]) {
    return chain.map(it => typeof it === 'string' ? this.mask(it) as T : it);
  }
}

export default new Tg2qWordFilter();