# Loomy test harnesses (Playwright)

Run from this folder with the site served locally:

    cd ~/aianimator && python3 -m http.server 8773 --bind 127.0.0.1 &
    cd tools/tests
    node cleanmaster.cjs        # Cartoons: full video with mocked AI, clean console check
    node clean3dmaster.cjs      # 3D: full video with mocked AI
    node clipe2e.cjs cliptest/wide.webm auto        # Clips with mocked AI
    node hubtest.cjs; node crewtest.cjs; node sense.cjs   # router, characters, stickers

Live tests (real AI on the deployed site) need `live.txt`: a Netscape cookie file holding a
`loomy_pass` cookie for loomy-app.pages.dev. It is a login, so it is never committed
(see .gitignore). Get one by entering an access code on the site and exporting the cookie.

    node clipe2e.cjs cliptest/wide.webm auto live
    node livevid.cjs "Some topic" out.mp4
    node livecheck.cjs

Clips switches (environment variables for clipe2e.cjs):

    COUNT=3                      # how many clips
    HEADSTYLE=pill               # the white-pill heading instead of the Bold default (S20)
    CAPSOFF=1                    # after the run, press "Turn Loomy's captions off" and re-make clip 1 (N22)
    node clipe2e.cjs cliptest/burned-mid.webm crop   # a source with captions burned in on Loomy's caption line

Music under the voice (Cartoons, 3D, Blocky): render the same video as voice only and as music only
(same script, same score, same master gain as the full mix), then measure:

    FIXED=1 NOPICS=1 VOICE=whole SCRIPT=proof/3d-fallback.json STEM=voice node mass.cjs 942 1 3d
    FIXED=1 NOPICS=1 VOICE=whole SCRIPT=proof/3d-fallback.json STEM=music node mass.cjs 943 1 3d
    python3 musiclevel.py mass/942-3d.mp4 mass/943-3d.mp4     # target: music 15-20 dB below the voice

The page switches behind it: ?stem=voice|music and ?musicseed=N (STEM and MUSICSEED for mass.cjs).
