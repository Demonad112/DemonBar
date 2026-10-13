#!/bin/bash
# Claude Code status line: colored bars for 5h / 7d usage, burn rate, exhaustion ETA,
# weekly pace, context tokens, git, cost/hour, lines changed, duration, style, version.
# Reads Claude Code's status JSON on stdin. Never errors: prints nothing if it can't work.
# Env: STATUSLINE_COLS=<n> forces the width used for the compact-mode decision.
export LC_NUMERIC=C

# --- locate jq (PATH, else the winget install location) ---
JQ=$(command -v jq)
if [ -z "$JQ" ]; then
  for p in "$LOCALAPPDATA"/Microsoft/WinGet/Packages/jqlang.jq_*/jq.exe; do
    [ -x "$p" ] && JQ="$p" && break
  done
fi
[ -z "$JQ" ] && exit 0

input=$(cat)
[ -z "$input" ] && exit 0

# --- one jq call, tab separated ("-" placeholders keep fields aligned) ---
IFS=$'\t' read -r model cwd cost dur_ms added removed style vim ver ctx_size sid \
  five_pct five_resets week_pct week_resets ctx_pct <<EOF
$(printf '%s' "$input" | "$JQ" -r '[
  (.model.display_name // "-"),
  (.workspace.current_dir // .cwd // "-"),
  (.cost.total_cost_usd // "-"),
  (.cost.total_duration_ms // "-"),
  (.cost.total_lines_added // "-"),
  (.cost.total_lines_removed // "-"),
  (.output_style.name // "-"),
  (.vim.mode // "-"),
  (.version // "-"),
  (.context_window.context_window_size // "-"),
  (.session_id // "default"),
  (.rate_limits.five_hour.used_percentage // "-"),
  (.rate_limits.five_hour.resets_at // "-"),
  (.rate_limits.seven_day.used_percentage // "-"),
  (.rate_limits.seven_day.resets_at // "-"),
  (.context_window.used_percentage // "-")
] | map(tostring) | join("\t")' 2>/dev/null)
EOF
for v in model cwd cost dur_ms added removed style vim ver ctx_size five_pct five_resets week_pct week_resets ctx_pct; do
  [ "${!v}" = "-" ] && printf -v "$v" ''
done

now=$(date +%s)
CACHE_DIR="$HOME/.claude/statusline-cache"
mkdir -p "$CACHE_DIR" 2>/dev/null
CACHE="$CACHE_DIR/$(printf '%s' "${sid:-default}" | tr -c 'A-Za-z0-9_-' '_')"
[ -d "$CACHE" ] && CACHE=/dev/null

# cache lines: 1 five_pct 2 five_resets 3 week_pct 4 week_resets 5 ref_ts 6 ref_pct 7 rate
c_five_pct=""; c_five_resets=""; c_week_pct=""; c_week_resets=""; ref_ts=""; ref_pct=""; rate=""
if [ -f "$CACHE" ]; then
  { read -r c_five_pct; read -r c_five_resets; read -r c_week_pct; read -r c_week_resets
    read -r ref_ts; read -r ref_pct; read -r rate; } < "$CACHE"
fi

# hold the last higher value unless the window timer has expired (API sometimes reports 0)
hold() { # new cached_pct cached_resets
  awk -v n="$1" -v c="$2" -v r="$3" -v now="$now" \
    'BEGIN{ if (c!="" && n+0 < c+0 && !(r!="" && now+0 >= r+0)) print c; else print n }'
}
if [ -n "$five_pct" ]; then
  if [ -n "$c_five_resets" ] && [ "$now" -ge "$c_five_resets" ] 2>/dev/null; then ref_ts=""; ref_pct=""; rate=""; fi
  five_pct=$(hold "$five_pct" "$c_five_pct" "$c_five_resets")
  c_five_resets="${five_resets:-$c_five_resets}"
fi
if [ -n "$week_pct" ]; then
  week_pct=$(hold "$week_pct" "$c_week_pct" "$c_week_resets")
  c_week_resets="${week_resets:-$c_week_resets}"
fi

# --- burn rate (%/min) from a reference sample, refreshed every 5 min ---
if [ -n "$five_pct" ]; then
  if [ -z "$ref_ts" ]; then
    ref_ts=$now; ref_pct=$five_pct; rate=""
  else
    el=$((now - ref_ts))
    if [ "$el" -ge 60 ]; then
      rate=$(awk -v p="$five_pct" -v r="$ref_pct" -v e="$el" 'BEGIN{ d=(p-r); if (d>0) printf "%.2f", d/(e/60); else print "" }')
      if [ "$el" -ge 300 ]; then ref_ts=$now; ref_pct=$five_pct; fi
    fi
  fi
fi

printf '%s\n%s\n%s\n%s\n%s\n%s\n%s\n' "$five_pct" "$c_five_resets" "$week_pct" "$c_week_resets" \
  "$ref_ts" "$ref_pct" "$rate" > "$CACHE" 2>/dev/null

# --- width / compact mode ---
cols="${STATUSLINE_COLS:-$COLUMNS}"
[ -z "$cols" ] && cols=$(stty size 2>/dev/null </dev/tty | awk '{print $2}')
[ -z "$cols" ] && cols=160
compact=0; [ "$cols" -lt 100 ] 2>/dev/null && compact=1

# --- rendering helpers ---
ESC=$(printf '\033')
RST="${ESC}[0m"; DIM="${ESC}[2m"; BOLD="${ESC}[1m"
# cool palette: blue (low) -> purple (mid) -> magenta (high)
LOW="${ESC}[38;5;75m"; MID="${ESC}[38;5;141m"; HI="${ESC}[38;5;205m"
CYN="${ESC}[38;5;117m"; MAG="${ESC}[38;5;177m"
OKG="${ESC}[38;5;78m"; BAD="${ESC}[38;5;203m"
if [ "$compact" -eq 1 ]; then SEP="${DIM} · ${RST}"; else SEP=" ${DIM}│${RST} "; fi

level() { awk -v p="$1" 'BEGIN{ if (p>=80) print "H"; else if (p>=50) print "M"; else print "L" }'; }
paint() { # pct text
  local c; case $(level "$1") in H) c=$HI;; M) c=$MID;; *) c=$LOW;; esac
  local b=""; awk -v p="$1" 'BEGIN{ exit !(p>=90) }' && b=$BOLD
  printf '%s%s%s%s' "$b" "$c" "$2" "$RST"
}
bar() { # pct width
  local pct=$1 w=${2:-8} f i out=""
  f=$(awk -v p="$pct" -v w="$w" 'BEGIN{ x=int(p/100*w+0.5); if(x<0)x=0; if(x>w)x=w; print x }')
  for ((i=0;i<w;i++)); do if [ $i -lt $f ]; then out+="▓"; else out+="░"; fi; done
  printf '%s' "$out"
}
time_until() {
  local d=$(( $1 - now )) days hrs mins
  [ "$d" -le 0 ] && { printf 'now'; return; }
  days=$((d/86400)); hrs=$(((d%86400)/3600)); mins=$(((d%3600)/60))
  if [ $days -gt 0 ]; then printf '%dd%02dh' $days $hrs
  elif [ $hrs -gt 0 ]; then printf '%dh%02dm' $hrs $mins
  else printf '%dm' $mins; fi
}
fmt_dur() { # seconds
  local s=$1
  if [ "$s" -ge 3600 ]; then printf '%dh%02dm' $((s/3600)) $(((s%3600)/60)); else printf '%dm' $((s/60)); fi
}
segment() { # label pct
  local r; r=$(printf '%.0f' "$2")
  if [ "$compact" -eq 1 ]; then
    printf '%s%s%s %s' "$DIM" "$1" "$RST" "$(paint "$2" "${r}%")"
  else
    printf '%s%s%s %s %s' "$DIM" "$1" "$RST" "$(paint "$2" "$(bar "$2")")" "$(paint "$2" "${r}%")"
  fi
}

out=""
add() { if [ -n "$out" ]; then out+="$SEP$1"; else out="$1"; fi; }

# model (+ output style / vim mode tags)
if [ "$compact" -eq 0 ] && [ -n "$model" ]; then
  s="${CYN}🧠 ${model}${RST}"
  [ -n "$style" ] && [ "$style" != "default" ] && s+=" ${DIM}[${style}]${RST}"
  [ -n "$vim" ] && s+=" ${DIM}(${vim})${RST}"
  add "$s"
fi

# folder + git branch
if [ "$compact" -eq 0 ] && [ -n "$cwd" ]; then
  g="${MAG}📁 $(basename "$cwd")${RST}"
  branch=$(git -C "$cwd" symbolic-ref --short -q HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    dirty=""
    [ -n "$(git -C "$cwd" status --porcelain 2>/dev/null | head -1)" ] && dirty="*"
    g+=" ${CYN}🌿 ${branch}${dirty}${RST}"
  fi
  add "$g"
fi

# 5h window: bar, reset countdown, burn rate, exhaustion ETA
if [ -n "$five_pct" ]; then
  s=$(segment "5h" "$five_pct")
  awk -v p="$five_pct" 'BEGIN{ exit !(p>=90) }' && s="${HI}⚠️${RST} $s"
  [ -n "$c_five_resets" ] && s+=" ${DIM}⏳$(time_until "$c_five_resets")${RST}"
  if [ -n "$rate" ]; then
    s+=" ${MID}🔥${rate}%/min${RST}"
    eta=$(awk -v p="$five_pct" -v r="$rate" -v now="$now" -v rs="${c_five_resets:-0}" \
      'BEGIN{ if (r>0 && p<100) { t=now+(100-p)/r*60; if (rs==0 || t<rs) printf "%d", t } }')
    [ -n "$eta" ] && s+=" ${HI}→$(date -d "@$eta" +%H:%M 2>/dev/null)${RST}"
  fi
  add "$s"
fi

# 7d window: bar, countdown, pace vs. an even burn across the week
if [ -n "$week_pct" ]; then
  s=$(segment "7d" "$week_pct")
  [ -n "$c_week_resets" ] && s+=" ${DIM}$(time_until "$c_week_resets")${RST}"
  if [ -n "$c_week_resets" ]; then
    pace=$(awk -v p="$week_pct" -v rs="$c_week_resets" -v now="$now" \
      'BEGIN{ e=1-(rs-now)/604800; if (e>0.02 && e<=1) printf "%.2f", (p/100)/e }')
    if [ -n "$pace" ]; then
      case $(awk -v x="$pace" 'BEGIN{ print (x<=0.9)?"G":(x<=1.1)?"Y":"R" }') in
        G) s+=" ${OKG}🟢×${pace}${RST}";;
        Y) s+=" ${MID}🟡×${pace}${RST}";;
        *) s+=" ${BAD}🔴×${pace}${RST}";;
      esac
    fi
  fi
  add "$s"
fi

# context: bar + tokens used/size
if [ -n "$ctx_pct" ]; then
  s=$(segment "ctx" "$ctx_pct")
  if [ "$compact" -eq 0 ] && [ -n "$ctx_size" ]; then
    tok=$(awk -v p="$ctx_pct" -v z="$ctx_size" 'BEGIN{ u=p/100*z; printf "%dk/%dk", u/1000+0.5, z/1000 }')
    s+=" ${DIM}${tok}${RST}"
  fi
  add "$s"
fi

# session extras (full mode only): lines changed, duration, cost + cost/hour, version
if [ "$compact" -eq 0 ]; then
  if [ -n "$added" ] || [ -n "$removed" ]; then
    add "${OKG}+${added:-0}${RST} ${BAD}-${removed:-0}${RST}"
  fi
  secs=""; [ -n "$dur_ms" ] && secs=$((${dur_ms%.*} / 1000))
  s=""
  [ -n "$secs" ] && s="${DIM}⏱ $(fmt_dur "$secs")${RST}"
  if [ -n "$cost" ]; then
    s+="${s:+ }${DIM}💰 \$$(printf '%.2f' "$cost")${RST}"
    if [ -n "$secs" ] && [ "$secs" -ge 300 ]; then
      s+=" ${DIM}(\$$(awk -v c="$cost" -v s="$secs" 'BEGIN{ printf "%.2f", c/(s/3600) }')/h)${RST}"
    fi
  fi
  [ -n "$s" ] && add "$s"
  [ -n "$ver" ] && add "${DIM}v${ver}${RST}"
fi

[ -n "$out" ] && printf '%s' "$out"
exit 0
