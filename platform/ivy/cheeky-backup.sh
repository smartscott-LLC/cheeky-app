#!/usr/bin/env bash
# Reference copy of Ivy s live ~/bin/cheeky-backup.sh (secrets stay in
# ~/.config-cheeky-backup.env on-box). Pause-aware alarm + archive-safe
# retention added 2026-11-16 after the auto-pause outage.
#!/usr/bin/env bash
# Nightly club data insurance + a heartbeat ALARM (see 2026-11-16 outage:
# Supabase auto-paused the inactive project; site half-darked for days while
# every dump failed silently). Retention never eats the archive during
# outages; a good run clears the alarm.
set -uo pipefail
source "$HOME/.config-cheeky-backup.env"
BIN=/usr/lib/postgresql/17/bin/pg_dump
ALARM="$HOME/backups/ALARM.txt"

CODE=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "https://ioqeddpgdilyyajsygmz.supabase.co/auth/v1/health" || echo 000)
if [ "$CODE" != "200" ]; then
  echo "$(date -Is) ALARM: supabase project unreachable (http $CODE) — CHECK DASHBOARD: project may be PAUSED" | tee -a "$ALARM" "$HOME/backups/backup.log"
  exit 1
fi

F="$HOME/backups/cheeky-$(date +%Y%m%dT%H%M%S).dump"
"$BIN" "$DB_FULL_URI" -Fc -f "$F" || { echo "$(date -Is) DUMP FAILED" | tee -a "$ALARM" "$HOME/backups/backup.log"; exit 1; }
SIZE=$(stat -c%s "$F")

# Prune: 0-byte attempts after 2 days; good dumps past 14 days ONLY while
# the newest good dump is fresher than 11 days (pause-safe archive).
find "$HOME/backups" -name 'cheeky-*.dump' -size 0 -mtime +2 -delete 2>/dev/null
LASTOK=$(find "$HOME/backups" -name 'cheeky-*.dump' -size +100k -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
NOW=$(date +%s)
if [ -n "$LASTOK" ] && [ $(( NOW - ${LASTOK%.*} )) -lt $(( 11 * 86400 )) ]; then
  find "$HOME/backups" -name 'cheeky-*.dump' -size +100k -mtime +14 -delete 2>/dev/null
fi

export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Other RCLONE_CONFIG_R2_ENV_AUTH=false
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT"
if rclone mkdir r2:ivy-backups >/dev/null 2>&1 && rclone copy "$F" r2:ivy-backups/ >/dev/null 2>&1; then
  rclone delete r2:ivy-backups/ --min-age 30d >/dev/null 2>&1; OFF=r2:ivy-backups
else
  OFF="r2:SKIPPED(unreachable)"
fi
rm -f "$ALARM"
echo "$(date -Is) backup ok $(basename "$F") ($SIZE bytes) offsite=$OFF"
