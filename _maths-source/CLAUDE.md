# APSSB Maths Practice by Amarjeet Sir: source

This folder builds the website in `../maths-by-amarjeet-sir/`, live at https://northeastpsc.co.in/maths-by-amarjeet-sir/ .
The owner is Amarjeet Sir, Maths faculty at Northeast PSC, Arunachal Pradesh. He writes instructions in Hindi or Hinglish. Reply to him in simple Roman Hinglish, short and phone-friendly.

## Golden rules
- Only change files inside `_maths-source/` and `maths-by-amarjeet-sir/`. Never touch anything else in this repository.
- Never edit `maths-by-amarjeet-sir/` by hand. Change the source here, then run `python3 publish.py`, which rebuilds the site and replaces `maths-by-amarjeet-sir/`.
- Change only what the owner asks. Do not change questions, solutions, phone numbers, prices, names, ranks or wording on your own. If something is unclear, ask one short question.
- No Claude or AI branding anywhere on the site.
- Keep the phone layout exactly as it is. Styles for tablets and laptops are in the `min-width: 768px` and `min-width: 1024px` media queries at the end of `site.css`.
- Commit the source change and the rebuilt `maths-by-amarjeet-sir/` together, with a short message. Then tell the owner in one or two lines what changed.

## Where things are
- `build3.py`: all website content in the `SITE` dictionary (stats, recent toppers, year-wise selections, batches and prices, free classes, marathons, guidance videos, books, centres, addresses and phone numbers, links, About and Message text) and the image map `IMG` / `USED_IMG`.
- `site_img/`: website photos and posters. Add a new image here, then register it in `IMG` and `USED_IMG` in `build3.py`.
- `app3.js`: the app (pages, quizzes, mock test, My report, score sharing).
- `template3.html`: page shell and base styles. `site.css`: website styles.
- `questions.json`, `solutions.json`: the 1,700 Basic Mathematics Practice Book questions and solutions (read through `build.py`).
- `pyq_data.py` to `pyq_data4.py`: the 536 APSSB previous year questions. `img/`: figures used in those questions.
- `build.py` and `build2.py` are read by `build3.py`. Do not run them directly.

## Build and publish
1. If `python3 -c "import PIL"` fails, run `pip install pillow`.
2. Run `python3 publish.py`. It runs `build3.py` (website in `site_pkg/`, single-file HTML and website zip in `dist/`), then replaces `../maths-by-amarjeet-sir/` with `site_pkg/`. The service worker cache name changes automatically, so students' phones pick up the new version.
3. If `node` is available, run `node test3.js && node test5.js && node test6.js`. They must report 0 problems and no bad tokens.
4. Commit and push.

## Optional
- `python3 brochure.py` makes the 2-page student brochure PDF in `dist/` (needs the DejaVu Sans fonts).

## History (from the owner's earlier claude.ai project chat)
This repository is now the master copy. Older copies made in that chat are out of date.

What is built:
- APSSB Maths Practice: 2,236 questions (1,700 from the book + 536 PYQ), 231 quizzes, mock test (25 questions, 50 marks, 30 minutes, CHSL pattern), My report, score sharing, installable app with offline practice.
- Website: selections and toppers, free classes, marathons, guidance, batches (Rs 1,500 Maths at the top, Rs 5,000 CSAT at the bottom), reviews, about, class photos, books, contact. Phone design is fixed; tablet/laptop styles are added.
- Made outside this repo: 2-page brochure (QR points to the new address) and a prompt for a separate CSAT platform.

Decisions:
- Live address: https://northeastpsc.co.in/maths-by-amarjeet-sir/ (repo northeast-psc). Flow for changes: owner writes in Claude Code, Claude pushes, owner merges, site goes live.
- Confirmed facts: WhatsApp 60095 26445, Pasighat 92337 89170, 1,000+ selections.
- The CSAT platform will be built later as a separate project (prompt + this website + CSAT file).
- Share the brochure only after the platform shows at the live link.

## Open items from the owner
1. Check the live link no longer shows "being prepared" (PR 1 was merged into main).
2. Google Form for students' name and WhatsApp number: not connected yet. It needs the form's pre-filled link.
3. Numbers to confirm: Itanagar (81189 84013 or 92337 89183), Naharlagun (70054 79070 or 98637 86864), and 60096 07689 / 84150 96728 from the old placeholder page.
4. Nirjuli address spelling "Chart & Chess" is still to be confirmed.
5. Basic book cover (before print): "2000+ Questions" should be 1,700; "Questioned Oriented" should be "Question Oriented".
6. Maths batch poster says "Offer valid today only". Replace the poster when the offer changes.
7. Marathon start times for Ratio, Time & Work, TSD, Statistics; topic times for the Percentage–TSD class.
8. Missing titles/links: title of Demo lecture 1, title of guidance video HJ-5xDyzhmk, link for CGL marathon Day 1 Reasoning.
9. 8 skipped PYQs (Q58, 211, 395, 479, 481, 497, 502, 529): correct versions, if they are to be added.
10. Optional: Google rating, student videos/feedback, Reasoning questions, Simplification PYQs, and fixing old info in YouTube descriptions (600+, org code jewus, 89749 41736).
11. Build check reports options with the same value in PYQ 358, 445 and 496. Ask the owner before changing.
