# APSSB Maths & Reasoning Practice by Amarjeet Sir: source

This folder builds the website in `../maths-by-amarjeet-sir/`, live at https://northeastpsc.co.in/maths-by-amarjeet-sir/ .
The owner is Amarjeet Sir, Maths and Reasoning faculty at Northeast PSC, Arunachal Pradesh. He writes instructions in Hindi or Hinglish. Reply to him in simple Roman Hinglish, short and phone-friendly.

## Purpose
The site exists to make students practise, keep them coming back, and turn that into course enquiries on WhatsApp. Keep practice free (the only form is the one-time name and WhatsApp number screen before a student's first quiz, added in Nov 2026 at the request of Northeast PSC co-founder Ali Sir so that Maths & Reasoning users can be counted separately from CSAT users), and keep course offers relevant and polite (no repeated popups).

## Golden rules
- Only change files inside `_maths-source/` and `maths-by-amarjeet-sir/`. Never touch anything else in this repository.
- Never edit `maths-by-amarjeet-sir/` by hand. Change the source here, then run `python3 publish.py`, which rebuilds the site and replaces `maths-by-amarjeet-sir/`.
- Change only what the owner asks. Do not change questions, solutions, phone numbers, prices, names, ranks or wording on your own. If something is unclear, ask one short question.
- No Claude or AI branding anywhere on the site.
- Keep the phone layout exactly as it is. Styles for tablets and laptops are in the `min-width: 768px` and `min-width: 1024px` media queries at the end of `site.css`.
- Commit the source change and the rebuilt `maths-by-amarjeet-sir/` together, with a short message. Then tell the owner in one or two lines what changed.

## Where things are
- `build3.py`: all website content in the `SITE` dictionary (stats, recent toppers, year-wise selections, batches and prices, free classes, marathons, guidance videos, books, centres, addresses and phone numbers, links, About and Message text) and the image map `IMG` / `USED_IMG`. It also turns `reasoning_data.json` into the Reasoning topics.
- `site_img/`: website photos and posters. Add a new image here, then register it in `IMG` and `USED_IMG` in `build3.py`.
- `app3.js`: the app (pages, Maths/Reasoning tabs, quizzes with up to five options, mock tests for both subjects, previous-year Reasoning papers built from the PYQ labels, Question of the day with streaks, Revise my mistakes, My report with "Send my report to Sir" on WhatsApp, score-based course offers after every quiz, one-time milestone offers, the "Which batch is right for me?" finder, score sharing). Everything a student does is saved only on their phone (localStorage key `apssb-basic-maths-v1`).
- `template3.html`: page shell and base styles. `site.css`: website styles.
- Maths: `questions.json`, `solutions.json` (1,700 Basic Mathematics Practice Book questions, read through `build.py`), `pyq_data.py` to `pyq_data4.py` (536 APSSB PYQs), `img/` (figures for those PYQs). `build.py` and `build2.py` are read by `build3.py`; do not run them directly.
- New questions: `new_questions.json` has 654 extra questions made by `gen_new_questions.py` (answers computed from the numbers): 130 Maths and 130 Reasoning questions in the "Mixed Practice Sets" topics, and 394 mock-test-only questions attached to their topics as `mq`. Together with the books this gives exactly 500 quizzes and 5,000 questions; keep those totals in mind before adding or removing questions.
- Reasoning: `reasoning_data.json` has all 2,110 questions of the APSSB Reasoning Practice Book in 19 chapters (sections, question, options, key as 0-4, brief solution, PYQ label such as "APSSB CGL 2024" or "Meghalaya 2023", figure key, directions passage). `rimg/` has the Reasoning figures as PNG files named by figure key. To fix a Reasoning question, edit its entry in `reasoning_data.json`.

## Build and publish
1. If `python3 -c "import PIL"` fails, run `pip install pillow`.
2. Run `python3 publish.py`. It runs `build3.py` (website in `site_pkg/`, single-file HTML and website zip in `dist/`), then replaces `../maths-by-amarjeet-sir/` with `site_pkg/`. The service worker cache name changes automatically, so students' phones pick up the new version.
3. If `node` is available, run `node test3.js && node test5.js && node test6.js && node test8.js && node test9.js && node test10.js`. They must report 0 problems and no bad tokens.
4. Commit and push.

## Optional
- `python3 brochure.py` makes the 2-page student brochure PDF in `dist/` (needs the DejaVu Sans fonts).

## Notes from checking the Reasoning book
- Corrected on the website: Classification Q15 option (c) "Quantum Machines" is shown as "Quantum Mechanics"; Alphabetical Series Q45 solution now says the repeating group is "mnom".
- Statement, Assertion & Decision Making Q5 is tagged only "APSSB" in the book (exam and year missing).

## Hosting note
- The page adds the missing "/" at the end of its own address before anything loads, so photos and Reasoning figures (`images/r/`) load even if the host drops the trailing slash. Keep that first `<script>` in the page head.

## Open items from the owner
- Home page batches (Nov 2026): the Batches section of the main site (`../index.html`, northeastpsc.co.in) is written by `../tools/sync_batches.py`. It combines this site's `SITE["resultAd"]`, `SITE["featured"]` and `SITE["courses"]` with the batches of the APPSCCE Prelims Practice site (`../csat-practice-by-amarjeet-sir/`), one entry per batch. `publish.py` runs it after every publish, so adding, removing or re-pricing a batch here updates the home page too. Commit `../index.html` and `../batch-posters/` together with the site. Each home page card shows the batch's poster. For the `resultAd` poster the home page writes the date and days left itself (`paintCd()` in `../index.html`, a copy of `paintCountdown()`), so if the text positions in `paintCountdown()` change for a new poster design, change them in `paintCd()` too.
- Result-screen poster (Nov 2026, asked by Northeast PSC co-founder Ali Sir): after every quiz the main poster is the APSSB 2026 Complete Online Recorded Course (₹1,999), set in `SITE["resultAd"]` in `build3.py`. The poster shows today's date and the days left to the Non-Ministerial and CSL exams. These are not part of the image: `site_img/batch-apssb-recorded-2026.jpg` has those areas cleared and `paintCountdown()` in `app3.js` writes them each day from `resultAd.exams` (Non-Ministerial 2026-11-29, CSL 2026-12-20, both tentative). The poster as supplied is in `poster_src/`. If an exam date changes, change only the date in `resultAd.exams`. For a new poster design, clear the same areas and update the text positions in `paintCountdown()`. Removing `SITE["resultAd"]` brings back the Maths & Reasoning batch poster.
- Answer positions (Nov 2026): the book quizzes had the same letter correct far too often (B was correct in 41% of Maths book questions, D in 7%, and some quizzes were all A). `_balance_answers()` in `build3.py` now gives each quiz of 10 an even spread of A, B, C and D. It never changes the source: `o` and `k` stay in source order and a question only gets `d` (display position -> source option index). `app3.js` shows options through `ordOf()` and `letterOf()`, and saved answers always use the source index, so students' old results stay correct. Questions are left alone when their options are figures or bare labels like (a) to (d), when the options or the solution refer to option letters, for fixed sets such as assertion-reason and statement-conclusion, and when the answer is 'None of these' (that option also keeps its place). When adding questions, write them in any order; the build spreads the answers.
- Google Form for students' name and WhatsApp number: connected (Nov 2026). `SITE["form"]` in `build3.py` holds the form's formResponse URL and the entry IDs for Name and WhatsApp number. Before a student's first quiz or mock test, `leadGate()` in `app3.js` asks for the details once and sends them to the form, which fills the Google Sheet. This is separate from the CSAT site's form on purpose: a student who filled details on the CSAT site is asked again here. Question of the day and all other pages stay open without the form.
- Nirjuli address spelling "Chart & Chess" is still to be confirmed.
