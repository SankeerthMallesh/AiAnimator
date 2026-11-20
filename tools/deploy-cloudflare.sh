# Deploy Loomy to Cloudflare Pages. Run from anywhere:  bash ~/aianimator/tools/deploy-cloudflare.sh
# First run: signs you in to Cloudflare, picks a free *.pages.dev name, and (optionally) sets up
# Google sign-in with a free database for synced work. Later runs just upload the latest version.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
W="npx --yes wrangler@4"
CANDIDATES="loomy loomy-app loomyapp getloomy loomy-studio loomy-ai"

command -v node >/dev/null || { echo "Install Node.js first from https://nodejs.org (LTS), then run this again."; exit 1; }
cd "$DIR"
$W whoami 2>/dev/null | grep -q "associated with the email" || $W login

# 1. The site's name and address (saved after the first run).
NAME=""; URL=""
[ -f "$HOME/.loomy-site" ] && read NAME URL < "$HOME/.loomy-site"
if [ -z "$NAME" ]; then
  for C in $CANDIDATES; do
    OUT=$($W pages project create "$C" --production-branch main 2>&1 || true)
    GOT=$(echo "$OUT" | grep -o 'https://[a-z0-9-]*\.pages\.dev' | head -1)
    if [ "$GOT" = "https://$C.pages.dev" ]; then NAME="$C"; URL="$GOT"; break; fi
    if [ -n "$GOT" ]; then $W pages project delete "$C" --yes >/dev/null 2>&1 || true; fi
    echo "  '$C' is taken, trying the next name..."
  done
  if [ -z "$NAME" ]; then
    NAME="loomy-$(whoami | tr -cd 'a-z0-9' | cut -c1-12)"
    OUT=$($W pages project create "$NAME" --production-branch main 2>&1 || true)
    URL=$(echo "$OUT" | grep -o 'https://[a-z0-9-]*\.pages\.dev' | head -1)
  fi
  echo "$NAME $URL" > "$HOME/.loomy-site"
fi

# 2. Google sign-in (optional). Asked once; delete ~/.loomy-google to change it.
if [ ! -f "$HOME/.loomy-google" ]; then
  echo ""
  echo "Google sign-in (optional): paste your Google Client ID, it ends with .apps.googleusercontent.com"
  echo "Press Enter to skip; Loomy works without it."
  read -r CID
  echo "$CID" | tr -d ' \r' > "$HOME/.loomy-google"
fi
CID="$(cat "$HOME/.loomy-google")"

# 3. Free Cloudflare D1 database for synced work (only with sign-in).
DBID=""
if [ -n "$CID" ]; then
  [ -s "$HOME/.loomy-db" ] && DBID="$(cat "$HOME/.loomy-db")"
  if [ -z "$DBID" ]; then
    OUT=$($W d1 create loomy-db 2>&1 || true)
    DBID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
    if [ -z "$DBID" ]; then
      DBID=$($W d1 list --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const d=JSON.parse(s).find(x=>x.name==='loomy-db');console.log(d?d.uuid:'')}catch{console.log('')}})")
    fi
    [ -n "$DBID" ] && echo "$DBID" > "$HOME/.loomy-db"
  fi
  [ -z "$DBID" ] && echo "Could not create the sync database; deploying without sign-in this time."
fi

# 4. Upload a clean copy with this site's settings.
BUILD="$(mktemp -d)"
cp -R "$DIR"/. "$BUILD"/
rm -rf "$BUILD/.git" "$BUILD/tools" "$BUILD/.github"
{
  echo "name = \"$NAME\""
  echo 'pages_build_output_dir = "."'
  echo 'compatibility_date = "2026-11-01"'
  printf '\n[ai]\nbinding = "AI"\n'
  if [ -n "$CID" ] && [ -n "$DBID" ]; then
    printf '\n[vars]\nGOOGLE_CLIENT_ID = "%s"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "loomy-db"\ndatabase_id = "%s"\n' "$CID" "$DBID"
  fi
} > "$BUILD/wrangler.toml"
(cd "$BUILD" && $W pages deploy . --project-name "$NAME" --branch main --commit-dirty=true)
rm -rf "$BUILD"

echo ""
echo "Done. Loomy is live at $URL"
if [ -n "$CID" ] && [ -n "$DBID" ]; then
  echo "Google sign-in is on. In Google Cloud, $URL must be listed under Authorized JavaScript origins."
else
  echo "Google sign-in is off. To add it later: rm ~/.loomy-google  then run this again."
fi
