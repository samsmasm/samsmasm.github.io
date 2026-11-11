/* worker.js: races a batch of cars with no drawing and sends back the results.
   The page runs several of these at once (one per spare CPU core), each with a
   slice of the population on the same track, then evolves on the main thread.
   Cars never touch each other, so splitting them changes nothing about the race.

   In:  { id, genomes, config, terrainSeed }
   Out: { id, results }        results[i] is the result for genomes[i]
        { id, error } */

// Planck's browser build passes `window` to its UMD wrapper; workers only have `self`.
self.window = self;
importScripts('https://unpkg.com/planck-js@0.3.31/dist/planck.js', 'sim.js');

onmessage = (e) => {
    const m = e.data;
    try {
        const race = new RC.Race(m.genomes, m.config, { terrainSeed: m.terrainSeed }).runToEnd();
        postMessage({ id: m.id, results: race.cars.map(c => c.result) });
    } catch (err) {
        postMessage({ id: m.id, error: String((err && err.message) || err) });
    }
};
