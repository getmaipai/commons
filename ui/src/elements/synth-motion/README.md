# Synth motion

Pure gesture analysis and selection. Inputs are decoded mono audio samples and plain gesture clip metadata; outputs are accent times and scheduled clip ids. No DOM, React, pack or player imports.

Tune behavior in the exported `SETTINGS` object: analysis uses 25 ms frames every 10 ms, 70 to 400 Hz F0, 0.5 voicing correlation, 12% pitch rise, 350 ms accent spacing, 120 ms lead, 200 ms reply guard and 600 ms gesture cooldown. Idle spacing is 8 to 15 seconds.

`pitchAccents(samples, sampleRate)` returns accent times. `createGesturePicker` chooses weighted clips without immediate repeats. `createGestureScheduler({ rng, clock, clips }).plan(accents, { speaking })` returns `{ at, clipId }` schedules.
