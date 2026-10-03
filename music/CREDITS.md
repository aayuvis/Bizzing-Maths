# Music — credits

Every piece of music in Bizzing Maths is **composed in code for Bizzing**. There are no audio
files, no samples and nothing licensed from anyone else.

`app/src/music.js` holds ten loops — one for each of the six worlds (Patchwork Hills, Chalk
Cliffs, Inventor's Harbour, Moon Garden, Rangoli Courtyard, Funfair Pier), one for Home, and
three for the games — as a tempo, a key, a mode, a chord progression and a melody grown from a
fixed seed. The browser's Web Audio API plays them on the device. Each loop is 24 or 32 bars,
60–90 seconds, and wraps to its first bar on the beat. `app/test/family2.mjs` holds them to that.

Source: composed in code for Bizzing, 2026. Licence: the app's own.

The sound effects (right, wrong, finish, medal, coin, unlock and the games' small sounds) are
synthesised the same way in `app/src/ui.js`.
