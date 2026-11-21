// Save / load for Vice Bay. Progress lives in localStorage so Rico's
// money, garage and finished missions survive a reload. All guarded:
// a blocked storage must never break the game.

const KEY = 'vicebay-save-v1';

export function createSave(G) {
  const save = {
    write() {
      try {
        const data = {
          money: G.money,
          ownedCars: G.ownedCars,
          missionsDone: G.missionsDone,
          bustedCount: G.bustedCount,
          kills: G.kills,
          carsStolen: G.carsStolen,
          stats: G.stats,
          time: G.time,
        };
        window.localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) { /* storage unavailable */ }
    },
    read() {
      try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (typeof data.money === 'number') G.money = data.money;
        if (Array.isArray(data.ownedCars)) G.ownedCars = data.ownedCars;
        if (Array.isArray(data.missionsDone)) G.missionsDone = data.missionsDone;
        if (typeof data.bustedCount === 'number') G.bustedCount = data.bustedCount;
        if (typeof data.kills === 'number') G.kills = data.kills;
        if (typeof data.carsStolen === 'number') G.carsStolen = data.carsStolen;
        if (data.stats) G.stats = { ...G.stats, ...data.stats };
        if (typeof data.time === 'number') G.time = data.time;
        return true;
      } catch (e) {
        return false;
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(KEY);
      } catch (e) { /* ignore */ }
    },
  };
  G.save = save;
  return save;
}
