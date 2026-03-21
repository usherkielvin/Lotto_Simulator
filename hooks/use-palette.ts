import { useColorScheme } from '@/hooks/use-color-scheme';

export type Palette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  heroBg: string;
  heroText: string;
  heroTextSoft: string;
  heroStageBg: string;
  textStrong: string;
  textSoft: string;
  accent: string;
  accentText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  chipIdle: string;
  chipIdleText: string;
  chipActive: string;
  chipActiveText: string;
  orbOne: string;
  orbTwo: string;
  stageBg: string;
  payout: string;
  warning: string;
};

export function usePalette(): Palette {
  const colorScheme = useColorScheme();

  if (colorScheme === 'dark') {
    return {
      screenBg:             '#08152c',
      cardBg:               '#0f2344',
      cardBorder:           '#23477e',
      heroBg:               '#0d3a78',
      heroText:             '#edf4ff',
      heroTextSoft:         '#a9c2e6',
      heroStageBg:          '#0a1b35',
      textStrong:           '#edf4ff',
      textSoft:             '#a9c2e6',
      accent:               '#f4b400',
      accentText:           '#2e2604',
      secondaryButton:      '#1a63c2',
      secondaryButtonText:  '#ecf4ff',
      chipIdle:             '#14315f',
      chipIdleText:         '#bdd2ef',
      chipActive:           '#f4b400',
      chipActiveText:       '#2f2706',
      orbOne:               '#0e2d5d',
      orbTwo:               '#123c73',
      stageBg:              '#0a1b35',
      payout:               '#84e4b7',
      warning:              '#ffb670',
    };
  }

  return {
    screenBg:             '#e8f0fe',
    cardBg:               '#ffffff',
    cardBorder:           '#b8cef0',
    heroBg:               '#0d47a1',
    heroText:             '#ffffff',
    heroTextSoft:         'rgba(255,255,255,0.80)',
    heroStageBg:          'rgba(255,255,255,0.18)',
    textStrong:           '#0d1f3c',
    textSoft:             '#3a5a8a',
    accent:               '#e6a800',
    accentText:           '#2e2200',
    secondaryButton:      '#1251a8',
    secondaryButtonText:  '#e8f0fe',
    chipIdle:             '#d0e2fb',
    chipIdleText:         '#1a3d6e',
    chipActive:           '#e6a800',
    chipActiveText:       '#2e2200',
    orbOne:               '#b8d0f8',
    orbTwo:               '#ccdcfc',
    stageBg:              '#edf4ff',
    payout:               '#0a6640',
    warning:              '#8f4f00',
  };
}
