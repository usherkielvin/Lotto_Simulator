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
    screenBg:             '#edf3ff',
    cardBg:               '#ffffff',
    cardBorder:           '#cadbf5',
    heroBg:               '#0f4ea9',
    heroText:             '#ffffff',
    heroTextSoft:         'rgba(255,255,255,0.72)',
    heroStageBg:          'rgba(255,255,255,0.15)',
    textStrong:           '#15305e',
    textSoft:             '#5a7299',
    accent:               '#f4b400',
    accentText:           '#342906',
    secondaryButton:      '#1260c4',
    secondaryButtonText:  '#eff5ff',
    chipIdle:             '#e3edfd',
    chipIdleText:         '#335d92',
    chipActive:           '#f4b400',
    chipActiveText:       '#332905',
    orbOne:               '#cadffd',
    orbTwo:               '#dde9ff',
    stageBg:              '#f2f7ff',
    payout:               '#0f7a4f',
    warning:              '#a86000',
  };
}
