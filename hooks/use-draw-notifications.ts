import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DRAW_NOTIFICATION_IDS_KEY } from '@/constants/settings';
import { apiFetch } from '@/hooks/use-api';

type LottoGameSchedule = {
  drawDays?: string;
};

type DrawReminderResult = {
  ok: boolean;
  message: string;
};

const DRAW_REMINDER_CHANNEL_ID = 'draw-reminders';
const DRAW_REMINDER_KIND = 'draw-reminder';
const DRAW_REMINDER_HOUR = 20;
const DRAW_REMINDER_MINUTE = 45;
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const DAY_NAME_TO_WEEKDAY: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function parseWeekdayToken(token: string): number | null {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized in DAY_NAME_TO_WEEKDAY) {
    return DAY_NAME_TO_WEEKDAY[normalized];
  }

  const numeric = Number(normalized);
  if (!Number.isInteger(numeric)) return null;

  if (numeric >= 0 && numeric <= 6) {
    return numeric + 1;
  }

  if (numeric === 7) {
    return 7;
  }

  return null;
}

async function getDrawWeekdaysFromGames(): Promise<number[]> {
  try {
    const games = await apiFetch<LottoGameSchedule[]>('/games');
    const weekdays = new Set<number>();

    games.forEach((game) => {
      if (!game.drawDays) return;

      game.drawDays
        .split(',')
        .map((token) => parseWeekdayToken(token))
        .filter((weekday): weekday is number => weekday !== null)
        .forEach((weekday) => weekdays.add(weekday));
    });

    if (weekdays.size === 0) {
      return [...DEFAULT_WEEKDAYS];
    }

    return Array.from(weekdays).sort((a, b) => a - b);
  } catch {
    return [...DEFAULT_WEEKDAYS];
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DRAW_REMINDER_CHANNEL_ID, {
    name: 'Draw reminders',
    description: 'Reminder notifications before draw lock-in.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#16a34a',
    sound: 'default',
  });
}

async function cancelByIdentifiers(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore stale IDs.
    }
  }
}

async function scheduleWeeklyDrawReminder(weekday: number) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Draw reminder',
      body: 'The 9:00 PM draw is in 15 minutes. Place your bet before lock-in.',
      data: {
        kind: DRAW_REMINDER_KIND,
        weekday,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour: DRAW_REMINDER_HOUR,
      minute: DRAW_REMINDER_MINUTE,
      channelId: DRAW_REMINDER_CHANNEL_ID,
    },
  });
}

export async function disableDrawReminders() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(DRAW_NOTIFICATION_IDS_KEY).catch(() => {});
    return;
  }

  const stored = parseStoredIds(await AsyncStorage.getItem(DRAW_NOTIFICATION_IDS_KEY));

  if (stored.length > 0) {
    await cancelByIdentifiers(stored);
  } else {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const drawReminderIds = allScheduled
      .filter((item) => {
        const data = item.content.data as Record<string, unknown> | undefined;
        return data?.kind === DRAW_REMINDER_KIND;
      })
      .map((item) => item.identifier);

    await cancelByIdentifiers(drawReminderIds);
  }

  await AsyncStorage.removeItem(DRAW_NOTIFICATION_IDS_KEY).catch(() => {});
}

export async function enableDrawReminders(): Promise<DrawReminderResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      message: 'Draw reminders are available on iOS and Android only.',
    };
  }

  await ensureAndroidChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    await disableDrawReminders();
    return {
      ok: false,
      message: 'Notification permission is disabled. Enable notifications in system settings, then try again.',
    };
  }

  await disableDrawReminders();

  const weekdays = await getDrawWeekdaysFromGames();
  const ids = await Promise.all(weekdays.map((weekday) => scheduleWeeklyDrawReminder(weekday)));
  await AsyncStorage.setItem(DRAW_NOTIFICATION_IDS_KEY, JSON.stringify(ids));

  return {
    ok: true,
    message: weekdays.length === 7
      ? 'Draw reminders are on. You will get a daily alert at 8:45 PM.'
      : 'Draw reminders are on for scheduled draw days at 8:45 PM.',
  };
}
