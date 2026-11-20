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
