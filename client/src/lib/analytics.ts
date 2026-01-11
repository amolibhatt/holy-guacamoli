type EventName = 
  | 'page_view'
  | 'login'
  | 'logout'
  | 'game_started'
  | 'game_completed'
  | 'question_answered'
  | 'buzzer_pressed'
  | 'pair_created'
  | 'pair_joined'
  | 'daily_questions_submitted'
  | 'weekly_stake_set'
  | 'board_created'
  | 'category_created'
  | 'question_created';

interface AnalyticsEvent {
  name: EventName;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

const eventQueue: AnalyticsEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(name: EventName, properties?: Record<string, string | number | boolean>) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };
  
  eventQueue.push(event);
  
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  
  flushTimeout = setTimeout(flushEvents, 5000);
  
  if (eventQueue.length >= 10) {
    flushEvents();
  }
}

async function flushEvents() {
  if (eventQueue.length === 0) return;
  
  const events = [...eventQueue];
  eventQueue.length = 0;
  
  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      // Re-queue events on failure (with limit to prevent memory issues)
      if (eventQueue.length < 50) {
        eventQueue.push(...events);
      }
    }
  } catch (error) {
    // Re-queue events on network failure (with limit)
    if (eventQueue.length < 50) {
      eventQueue.push(...events);
    }
    console.debug('Analytics flush failed, will retry:', error);
  }
}

export function trackPageView(page: string) {
  trackEvent('page_view', { page });
}
