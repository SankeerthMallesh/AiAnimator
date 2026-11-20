# One-time setup: GitHub deploys Loomy to Cloudflare on every push, so no one has to run the deploy script.
# Run on your Mac:  bash ~/aianimator/tools/github-deploy-setup.sh
# It asks for your Cloudflare API token (hidden as you paste) and stores it as an encrypted GitHub secret.
set -e
REPO="SankeerthMallesh/aianimator"

# 1. GitHub's command-line tool.
if ! command -v gh >/dev/null; then
  if command -v brew >/dev/null; then
    echo "Installing the GitHub command-line tool..."
    brew install gh
  else
    echo "Homebrew is needed first. Install it with the command on https://brew.sh, then run this again."
    exit 1
  fi
fi
gh auth status >/dev/null 2>&1 || { echo "Sign in to GitHub (a browser window opens):"; gh auth login --hostname github.com --git-protocol https --web; }

# 2. The Cloudflare token, hidden while you paste.
echo ""
read -r -s -p "Paste your Cloudflare API token, then press Enter (it stays hidden): " TOKEN; echo ""
TOKEN="$(printf '%s' "$TOKEN" | tr -d ' \r\n')"
[ -n "$TOKEN" ] || { echo "No token pasted."; exit 1; }
CHECK="$(curl -s -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify)"
echo "$CHECK" | grep -q '"status":"active"' || { echo "Cloudflare did not accept that token. Check you copied all of it and removed the IP filter."; exit 1; }
ACCOUNT="$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/accounts?per_page=5" | grep -o '"id":"[0-9a-f]\{32\}"' | head -1 | cut -d'"' -f4)"
[ -n "$ACCOUNT" ] || { echo "Could not find your Cloudflare account with that token (it needs Account Settings: Read)."; exit 1; }
echo "Token works."

# 3. This site's settings, from your earlier deploys.
NAME=""; URL=""
[ -f "$HOME/.loomy-site" ] && read NAME URL < "$HOME/.loomy-site"
NAME="${NAME:-loomy-app}"
CID="$(cat "$HOME/.loomy-google" 2>/dev/null || true)"
DBID="$(cat "$HOME/.loomy-db" 2>/dev/null || true)"

# 4. Store everything in the GitHub repo (secrets are encrypted; GitHub never shows them again).
printf '%s' "$TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R "$REPO"
printf '%s' "$ACCOUNT" | gh secret set CLOUDFLARE_ACCOUNT_ID -R "$REPO"
gh variable set LOOMY_PROJECT -R "$REPO" --body "$NAME"
[ -n "$CID" ] && gh variable set LOOMY_GOOGLE_CLIENT_ID -R "$REPO" --body "$CID"
[ -n "$DBID" ] && gh variable set LOOMY_D1_ID -R "$REPO" --body "$DBID"
unset TOKEN

# 5. Deploy now, to check it all works.
echo "Starting a deploy on GitHub..."
gh workflow run deploy.yml -R "$REPO" --ref main >/dev/null 2>&1 || true
echo ""
echo "Done. From now on every update pushed to GitHub goes live by itself."
echo "Watch it here: https://github.com/$REPO/actions"
