#!/bin/bash
# Defer Claude Code auto-compaction until a turn boundary.
#
#   PostToolUse      -> busy   (a turn is in progress)
#   UserPromptSubmit -> idle   (new turn starting, nothing run yet)
#   Stop             -> idle   (turn finished)
#   PreCompact(auto) -> check  (block while busy)
#
# Safety valve: if the last recorded context size is already >= the ceiling,
# compaction is allowed even mid-turn, because blocking the recovery
# compaction at the hard limit makes the request fail.
#
# Env: COMPACT_GUARD_CEILING (tokens, default 175000)
#      COMPACT_GUARD_LOG     (path; append a debug line per call when set)

input=$(cat)
sid=$(jq -r '.session_id // empty' <<<"$input")
[ -n "$sid" ] || exit 0
state="${TMPDIR:-/tmp}/claude-compact-guard-$sid"
ceiling="${COMPACT_GUARD_CEILING:-175000}"

log() { [ -n "$COMPACT_GUARD_LOG" ] && echo "$(date +%T) $sid $*" >>"$COMPACT_GUARD_LOG"; return 0; }

context_tokens() {
  local t
  t=$(jq -r '.transcript_path // empty' <<<"$input")
  [ -f "$t" ] || { echo 0; return; }
  tail -n 200 "$t" | jq -rs '
    [.[] | select(.type == "assistant" and .message.usage != null) | .message.usage] | last
    | if . == null then 0 else
        (.input_tokens // 0) + (.cache_read_input_tokens // 0)
        + (.cache_creation_input_tokens // 0) + (.output_tokens // 0) end' 2>/dev/null || echo 0
}

case "$1" in
  busy) touch "$state"; log busy ;;
  idle) rm -f "$state"; log idle ;;
  check)
    if [ ! -f "$state" ]; then
      log "check: idle -> allow"
    else
      tokens=$(context_tokens)
      if [ "${tokens:-0}" -ge "$ceiling" ]; then
        log "check: busy, ${tokens} >= ${ceiling} -> allow (safety valve)"
      else
        log "check: busy, ${tokens} tokens -> block"
        echo "compact-guard: mid-turn, deferring auto-compact to next turn" >&2
        exit 2
      fi
    fi
    ;;
esac
exit 0
