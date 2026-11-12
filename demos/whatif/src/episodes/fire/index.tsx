import { defineEpisode, Timeline } from '../../engine';
import timeline from './timeline.json';
import { Sh1, Sh2, Sh3 } from './shots';

export const fire = defineEpisode('Fire', { timeline: timeline as unknown as Timeline, shots: { Sh1, Sh2, Sh3 }, looks: {} });
