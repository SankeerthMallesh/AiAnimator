# Store free AI keys on the Loomy server (Cloudflare Pages secrets), so they work on every device
# and never appear in the app's code. Run on your Mac:  bash ~/aianimator/tools/add-ai-keys.sh
#   Gemini     -> writes scripts first (saves the Cloudflare allowance for pictures)
#   Groq       -> backup script writer
#   ElevenLabs -> the most human voice (free plan: about 10 minutes a month, then Aura-2 takes over)
# Each key is hidden while you paste. Press Enter on an empty prompt to skip that one.
set -e
REPO="SankeerthMallesh/AiAnimator"
W="npx --yes wrangler@4"
NAME=""; URL=""
[ -f "$HOME/.loomy-site" ] && read NAME URL < "$HOME/.loomy-site"
NAME="${NAME:-loomy-app}"
$W whoami 2>/dev/null | grep -q "associated with the email" || $W login

ask() { # name, page, label, check-command
  local VAR="$1" PAGE="$2" LABEL="$3" CHECK="$4" KEY=""
  echo ""
  echo "=== $LABEL ==="
  echo "Opening $PAGE  (sign in, create a key, copy it)"
  open "$PAGE" 2>/dev/null || true
  read -r -s -p "Paste the key and press Enter (hidden; Enter alone skips): " KEY; echo ""
  KEY="$(printf '%s' "$KEY" | tr -d ' \r\n')"
  [ -z "$KEY" ] && { echo "Skipped."; return; }
  if [ -n "$CHECK" ]; then
    CODE="$(K="$KEY" bash -c "$CHECK")"
    if [ "$CODE" != "200" ]; then echo "That key was refused (HTTP $CODE). Skipped; run this again to retry."; return; fi
    echo "Key works."
  fi
  printf '%s' "$KEY" | $W pages secret put "$VAR" --project-name "$NAME" >/dev/null && echo "Saved on your Loomy server."
  ADDED=1
}

ADDED=0
ask GEMINI_KEY "https://aistudio.google.com/apikey" "Gemini (free script writer)" \
  'curl -s -o /dev/null -w "%{http_code}" -H "x-goog-api-key: $K" https://generativelanguage.googleapis.com/v1beta/models'
ask GROQ_KEY "https://console.groq.com/keys" "Groq (free backup writer)" \
  'curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $K" https://api.groq.com/openai/v1/models'
ask ELEVEN_KEY "https://elevenlabs.io/app/settings/api-keys" "ElevenLabs (most human voice; give the key Text to Speech access)" ""

if [ "$ADDED" = "1" ]; then
  echo ""
  echo "Redeploying so the keys take effect..."
  if command -v gh >/dev/null && gh workflow run deploy.yml -R "$REPO" --ref main >/dev/null 2>&1; then
    echo "Started on GitHub. Live in about a minute: https://github.com/$REPO/actions"
  else
    bash "$HOME/aianimator/tools/deploy-cloudflare.sh"
  fi
fi
echo ""
echo "Done. To remove a key later:  npx wrangler pages secret delete GEMINI_KEY --project-name $NAME"
