import { getDb } from '@/lib/demoDb';
import { DEMO_SEARCH_KEY } from '@/lib/config';
import { evaluateEligibility } from '@/services/eligibilityService';
import { isAvailableNow, toResourceWithMeta, type ResourceWithMeta } from '@/services/resourceService';
import { todayISO } from '@/utils/date';
import type { IncidentCategory, Resource } from '@/types';

// Rule-based AI assistance. This is deliberately transparent and deterministic.
// No external AI key is required, and no safety-critical decision is automated.

type SearchHistory = Record<string, { query: string; at: string }[]>;

function readSearchHistory(): SearchHistory {
  try {
    const raw = localStorage.getItem(DEMO_SEARCH_KEY);
    return raw ? (JSON.parse(raw) as SearchHistory) : {};
  } catch {
    return {};
  }
}

export function recordSearch(userId: string, query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = readSearchHistory();
  const entries = history[userId] ?? [];
  const next = [{ query: trimmed, at: new Date().toISOString() }, ...entries.filter((e) => e.query !== trimmed)].slice(0, 8);
  history[userId] = next;
  try {
    localStorage.setItem(DEMO_SEARCH_KEY, JSON.stringify(history));
  } catch {
    // ignore storage failures
  }
}

export function getSearchHistory(userId: string): string[] {
  return (readSearchHistory()[userId] ?? []).map((entry) => entry.query);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function similarityScore(resource: Resource, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const haystack = new Set(
    tokenize(
      `${resource.name} ${resource.category} ${resource.description} ${resource.location} ${resource.institutionName} ${resource.requiredTraining.join(' ')} ${resource.requiredQualifications.join(' ')}`,
    ),
  );
  let hits = 0;
  queryTokens.forEach((token) => {
    if (haystack.has(token)) hits += 1;
    else if ([...haystack].some((h) => h.startsWith(token) || token.startsWith(h))) hits += 0.5;
  });
  return hits / queryTokens.length;
}

export interface MatchOptions {
  query?: string;
  category?: string;
  location?: string;
  limit?: number;
  userId?: string;
}

export interface MatchResult {
  resource: ResourceWithMeta;
  score: number;
  reasons: string[];
}

export function smartMatch(options: MatchOptions): MatchResult[] {
  const db = getDb();
  const queryTokens = tokenize(options.query ?? '');
  const searchHistory = options.userId ? getSearchHistory(options.userId) : [];
  const historyTokens = tokenize(searchHistory.join(' '));
  const userBookings = options.userId
    ? db.bookings.filter((b) => b.userId === options.userId)
    : [];
  const bookedCategories = new Set(
    userBookings
      .map((b) => db.resources.find((r) => r.id === b.resourceId)?.category)
      .filter(Boolean) as string[],
  );

  const results: MatchResult[] = db.resources
    .filter((r) => r.active)
    .map((resource) => {
      const reasons: string[] = [];
      let score = 0;
      const textScore = similarityScore(resource, queryTokens);
      if (textScore > 0) {
        score += textScore * 45;
        reasons.push('Matches your search terms');
      }
      const historyScore = similarityScore(resource, historyTokens);
      if (historyScore > 0) {
        score += historyScore * 15;
        reasons.push('Related to your recent searches');
      }
      if (options.category && resource.category === options.category) {
        score += 20;
        reasons.push('Matches the selected category');
      }
      if (options.location && resource.location.toLowerCase().includes(options.location.toLowerCase())) {
        score += 15;
        reasons.push('Located near your preferred area');
      }
      if (bookedCategories.has(resource.category)) {
        score += 10;
        reasons.push('Similar to resources you booked before');
      }
      if (isAvailableNow(resource)) {
        score += 8;
        reasons.push('Available today');
      }
      if (options.userId) {
        const eligibility = evaluateEligibility(options.userId, resource);
        if (eligibility.status === 'eligible') {
          score += 12;
          reasons.push('You meet the eligibility requirements');
        } else if (eligibility.status === 'pending') {
          score -= 2;
          reasons.push('Eligibility verification pending');
        } else {
          score -= 6;
        }
      }
      const bookingCount = db.bookings.filter((b) => b.resourceId === resource.id).length;
      score += Math.min(bookingCount, 10) * 0.6;
      return { resource: toResourceWithMeta(resource), score: Math.round(score * 10) / 10, reasons };
    })
    .filter((result) => (queryTokens.length === 0 ? result.score > -100 : result.score > 0))
    .sort((a, b) => b.score - a.score || b.resource.bookingCount - a.resource.bookingCount);

  return results.slice(0, options.limit ?? 6);
}

export function getRecommendations(userId: string, limit = 4): MatchResult[] {
  const db = getDb();
  const pastBookings = db.bookings.filter((b) => b.userId === userId);
  const categories = new Set<string>();
  pastBookings.forEach((b) => {
    const resource = db.resources.find((r) => r.id === b.resourceId);
    if (resource) categories.add(resource.category);
  });
  const history = getSearchHistory(userId).join(' ');
  const options: MatchOptions = {
    userId,
    query: history,
    limit: limit * 3,
  };
  const results = smartMatch(options);
  const preferred = results.filter((r) => categories.has(r.resource.category));
  const merged = [...preferred, ...results.filter((r) => !preferred.includes(r))];
  return merged
    .filter((r) => !pastBookings.some((b) => b.resourceId === r.resource.id && b.status !== 'cancelled'))
    .slice(0, limit);
}

export function summarizeIncident(description: string, category: IncidentCategory): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences[0] ?? cleaned;
  const keySignals: string[] = [];
  const lowered = cleaned.toLowerCase();
  if (lowered.includes('damage') || lowered.includes('broken') || lowered.includes('crack')) {
    keySignals.push('possible equipment damage');
  }
  if (lowered.includes('late') || lowered.includes('delay')) keySignals.push('delay/late return');
  if (lowered.includes('unsafe') || lowered.includes('safety') || lowered.includes('injury')) {
    keySignals.push('safety concern');
  }
  if (lowered.includes('missing') || lowered.includes('lost')) keySignals.push('missing item');
  const summary = `${category.replace(/_/g, ' ')}: ${first.slice(0, 180)}${first.length > 180 ? '…' : ''}${
    keySignals.length ? ` Signals: ${keySignals.join(', ')}.` : ''
  }`;
  return summary;
}

export interface UsageInsight {
  mostUsed: { name: string; bookings: number }[];
  underused: { name: string; bookings: number }[];
  summary: string;
}

export function usageInsights(): UsageInsight {
  const db = getDb();
  const rows = db.resources.map((resource) => ({
    name: resource.name,
    bookings: db.bookings.filter((b) => b.resourceId === resource.id && b.status !== 'cancelled').length,
  }));
  const sorted = [...rows].sort((a, b) => b.bookings - a.bookings);
  const mostUsed = sorted.slice(0, 3).filter((r) => r.bookings > 0);
  const underused = [...sorted].reverse().slice(0, 3);
  const summary =
    mostUsed.length > 0
      ? `${mostUsed[0].name} is the most requested resource with ${mostUsed[0].bookings} booking(s). ${
          underused[0]?.name ?? 'Several resources'
        } has the lowest demand and may benefit from promotion.`
      : 'Not enough booking data yet to identify usage trends.';
  return { mostUsed, underused, summary };
}

export function schedulingSuggestions(resourceId: string, date: string): string[] {
  const db = getDb();
  const resource = db.resources.find((r) => r.id === resourceId);
  if (!resource) return [];
  const sameDate = db.bookings.filter(
    (b) => b.resourceId === resourceId && b.startDate === date && b.status !== 'cancelled',
  );
  if (sameDate.length === 0) return ['This date is fully free — submit your preferred time slot.'];
  return sameDate.map(
    (b) =>
      `Existing ${b.status} booking: ${b.startTime}–${b.endTime}. Choose a non-overlapping slot or join the waiting list.`,
  );
}

export const todayForSuggestions = todayISO;
