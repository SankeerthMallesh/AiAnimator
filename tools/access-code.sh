# Loomy access codes. Run on your own computer only: the secret that makes codes lives here.
#   bash ~/aianimator/tools/access-code.sh forever   a code that never expires (for you)
#   bash ~/aianimator/tools/access-code.sh 30        a code that works for 30 days (for a friend)
#   bash ~/aianimator/tools/access-code.sh reset     cancel every code ever made, then make a new one
# The first run turns the lock on and redeploys Loomy.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRET_FILE="$HOME/.loomy-access-secret"
W="npx --yes wrangler@4"
ARG="${1:-forever}"

NAME=""; URL=""
[ -f "$HOME/.loomy-site" ] && read NAME URL < "$HOME/.loomy-site"
[ -z "$NAME" ] && { echo "Deploy Loomy first: bash ~/deploy-loomy.sh"; exit 1; }

upload_secret() {
  echo "Turning the lock on at $URL ..."
  printf '%s' "$(cat "$SECRET_FILE")" | $W pages secret put ACCESS_SECRET --project-name "$NAME" >/dev/null
  bash "$DIR/tools/deploy-cloudflare.sh" >/dev/null
  echo "Locked. Every browser now needs a code."
}

if [ "$ARG" = "reset" ]; then
  openssl rand -hex 32 > "$SECRET_FILE"; chmod 600 "$SECRET_FILE"
  upload_secret
  echo "All old codes stopped working."
  ARG="forever"
elif [ ! -s "$SECRET_FILE" ]; then
  openssl rand -hex 32 > "$SECRET_FILE"; chmod 600 "$SECRET_FILE"
  upload_secret
fi

if [ "$ARG" = "forever" ]; then
  EXP="99991231"; LABEL="never expires"
else
  case "$ARG" in ''|*[!0-9]*) echo "Use: forever, a number of days (like 30), or reset"; exit 1 ;; esac
  EXP="$(date -v+"$ARG"d +%Y%m%d 2>/dev/null || date -d "+$ARG days" +%Y%m%d)"
  LABEL="works until $(echo "$EXP" | sed -E 's/(....)(..)(..)/\1-\2-\3/')"
fi
SIG="$(printf 'code:%s' "$EXP" | openssl dgst -sha256 -hmac "$(cat "$SECRET_FILE")" | awk '{print $NF}' | cut -c1-12 | tr 'a-f' 'A-F')"
echo ""
echo "  Access code ($LABEL):"
echo ""
echo "      LOOMY-$EXP-$SIG"
echo ""
echo "  Enter it once at $URL"
