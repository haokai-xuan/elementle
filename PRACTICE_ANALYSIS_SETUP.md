# Freeplay and archive analysis

Freeplay and archive rounds already persist in the API's `practice_games` table. Each round stores its owner, answer, and ordered guesses; unsaved guesses remain in the browser's retry queue until synchronization succeeds.

Before deploying the updated API, run `010_practice_hints.sql` once against its MySQL database. It adds persisted hint usage and timing. Existing rounds default to no recorded hint usage because historical hints were not saved.

Deploy `practice.py` and `calculate_game_score.py`, then restart/deploy the frontend. Completed daily, archive, and Freeplay games now show **Analyze with elBot**. Practice analysis waits for saved guesses and reads the authenticated user's saved game by ID. It rejects other users' games and unfinished rounds. It does not change daily stats, streaks, Vault progress, or elELO.

Verify both wins and eight-guess losses in each practice mode. Use a hint before finishing and confirm the replay and independence score reflect its saved timing. Reload a completed round and verify analysis still works. Interrupt a save: analysis must remain disabled until **Save interrupted · Retry** succeeds. Analyze a game ID under another account: it must return 404 without revealing the answer.
