/* Show the "Live now" badge when the parish sets liveNow, or automatically during a streamed service. */
import { nowIn } from '../lib/calendar';
import { ctx, readJson } from '../lib/client';
import { liveNow, occurrences } from '../lib/schedule';

const badges = document.querySelectorAll<HTMLElement>('[data-live-badge]');
if (badges.length) {
  const c = ctx() as any;
  const data = readJson('kiot-schedule');
  const check = () => {
    const now = nowIn(c.timeZone);
    const { items } = occurrences(now.day - 1, now.day, data, data.feasts, c.calendar);
    const on = c.liveNow || !!liveNow(items, now);
    badges.forEach((b) => (b.hidden = !on));
  };
  check();
  setInterval(check, 60_000);
}
