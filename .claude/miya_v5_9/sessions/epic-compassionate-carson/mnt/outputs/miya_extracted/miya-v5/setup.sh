#!/bin/bash
# ============================================================
# MiyaAI v5.7 — Loyiha Sozlash Skripti
# Ishlatish: bash setup.sh
# Bir marta ishlating — barcha infratuzilma tayyor bo'ladi
# ============================================================

set -e  # Xato bo'lsa darhol to'xta

# --- Ranglar ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${BLUE}→  $1${NC}"; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        MiyaAI v5.7 — SETUP           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ============================================================
# 1. MUHIT TEKSHIRUVI
# ============================================================
echo "📋 Muhit tekshirilmoqda..."

command -v node   >/dev/null 2>&1 || err "Node.js topilmadi. https://nodejs.org"
command -v git    >/dev/null 2>&1 || err "Git topilmadi."
command -v claude >/dev/null 2>&1 || warn "Claude Code topilmadi — keyinroq o'rnating: npm i -g @anthropic-ai/claude-code"

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VER" -lt 18 ] && err "Node.js 18+ kerak. Hozir: $(node -v)"

ok "Muhit tayyor (Node $(node -v))"
echo ""

# ============================================================
# 2. PAPKALAR
# ============================================================
echo "📁 Papkalar yaratilmoqda..."

mkdir -p .claude/hooks
mkdir -p .miya/results
mkdir -p .miya/archive

ok "Papkalar: .claude/hooks | .miya/results | .miya/archive"
echo ""

# ============================================================
# 3. CLAUDE PERMISSIONS (.claude/settings.json)
# ============================================================
echo "🔐 Ruxsatlar sozlanmoqda..."

if [ -f ".claude/settings.json" ]; then
  warn "settings.json mavjud — o'tkazib yuborildi (qo'lda tekshiring)"
else
  cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Write(src/**)",
      "Write(supabase/migrations/**)",
      "Write(.miya/results/**)",
      "Write(CLAUDE.md)",
      "Write(TODO.md)",
      "Write(STATUS.md)",
      "Write(SESSION_LAST.md)",
      "Write(SESSION_HISTORY.md)",
      "Write(SCHEMA_SNAPSHOT.md)",
      "Write(INCOMPLETE_WORK.md)",
      "Write(ANTI_PATTERNS.md)",
      "Write(TECH_DEBT.md)",
      "Write(DECISION_LOG.md)",
      "Write(SPRINT_PLAN.md)",
      "Write(RISK_REGISTER.md)",
      "Write(FEATURE_FLAGS.md)",
      "Write(USER_PROFILE.md)",
      "Bash(npx tsc --noEmit)",
      "Bash(npx eslint src/**)",
      "Bash(npm run test)",
      "Bash(npm run build)",
      "Bash(npm run lint)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git stash)",
      "Bash(git stash pop)",
      "Bash(mkdir *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(wc *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push *)",
      "Bash(git reset --hard *)",
      "Bash(git rebase *)",
      "Bash(npx supabase db push *)",
      "Bash(npx supabase db reset *)",
      "Write(.env*)",
      "Write(.claude/settings.json)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/post-write-ts.sh $TOOL_INPUT_PATH"
          },
          {
            "type": "command",
            "command": ".claude/hooks/post-write-migration.sh $TOOL_INPUT_PATH"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/pre-write-snapshot.sh $TOOL_INPUT_PATH"
          }
        ]
      }
    ]
  }
}
EOF
  ok "settings.json yaratildi"
fi
echo ""

# ============================================================
# 4. HOOKS
# ============================================================
echo "🪝  Hooks yaratilmoqda..."

# Hook 1: TypeScript tekshiruv (har TS/TSX fayl yozilganda)
cat > .claude/hooks/post-write-ts.sh << 'EOF'
#!/bin/bash
FILE=$1
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  if ! npx tsc --noEmit 2>/dev/null; then
    echo "❌ TypeScript xato: $FILE"
    echo "→ npx tsc --noEmit — batafsil ko'ring"
    exit 1
  fi
fi
exit 0
EOF

# Hook 2: Migration validatsiya (DOWN bo'lmasa BLOCK)
cat > .claude/hooks/post-write-migration.sh << 'EOF'
#!/bin/bash
FILE=$1
if [[ "$FILE" == *migrations* && "$FILE" == *.sql ]]; then
  if ! grep -q "DOWN\|rollback\|ROLLBACK" "$FILE" 2>/dev/null; then
    echo "❌ Migration DOWN yo'q: $FILE"
    echo "→ Har migration da -- DOWN bo'limi majburiy"
    exit 1
  fi
  if grep -qE "DROP TABLE|DROP COLUMN|RENAME COLUMN" "$FILE" 2>/dev/null; then
    echo "⚠️  XAVFLI migration: $FILE"
    echo "→ DROP/RENAME aniqlandi — zero-downtime pattern ishlatilganmi?"
    echo "→ Davom etish uchun: foydalanuvchi tasdiqlashi kerak"
    exit 1
  fi
fi
exit 0
EOF

# Hook 3: Har Write dan oldin git snapshot
cat > .claude/hooks/pre-write-snapshot.sh << 'EOF'
#!/bin/bash
FILE=$1
# Faqat src/ va migrations/ uchun snapshot
if [[ "$FILE" == src/* || "$FILE" == *migrations* ]]; then
  if git diff --quiet 2>/dev/null; then
    :  # O'zgarish yo'q — skip
  else
    git stash -q --include-untracked 2>/dev/null && \
    echo "📸 Snapshot saqlandi (git stash) — xato bo'lsa: git stash pop" || \
    true  # Snapshot muvaffaqiyatsiz bo'lsa — bloklanmaydi
  fi
fi
exit 0
EOF

chmod +x .claude/hooks/post-write-ts.sh
chmod +x .claude/hooks/post-write-migration.sh
chmod +x .claude/hooks/pre-write-snapshot.sh

ok "3 ta hook yaratildi va ruxsat berildi"
echo ""

# ============================================================
# 5. MEMORY FAYLLAR (templates/ dan)
# ============================================================
echo "📄 Memory fayllar tekshirilmoqda..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
  warn "templates/ papkasi topilmadi — memory fayllar qo'lda qo'yilishi kerak"
else
  MEMORY_FILES=(
    "CLAUDE.md" "TODO.md" "STATUS.md" "PROJECT.md"
    "SESSION_LAST.md" "SESSION_HISTORY.md"
    "SCHEMA_SNAPSHOT.md" "SPRINT_PLAN.md"
    "INCOMPLETE_WORK.md" "ANTI_PATTERNS.md"
    "TECH_DEBT.md" "RISK_REGISTER.md"
    "DECISION_LOG.md" "FEATURE_FLAGS.md"
    "USER_PROFILE.md" "ASSUMPTIONS.md"
    "DEPENDENCY_MAP.md" "PAGE_REGISTRY.md"
  )

  COPIED=0
  SKIPPED=0
  for f in "${MEMORY_FILES[@]}"; do
    if [ ! -f "$f" ]; then
      if [ -f "$TEMPLATES_DIR/$f" ]; then
        cp "$TEMPLATES_DIR/$f" "./$f"
        ((COPIED++))
      fi
    else
      ((SKIPPED++))
    fi
  done

  ok "$COPIED ta memory fayl ko'chirildi | $SKIPPED ta mavjud — o'tkazib yuborildi"
fi
echo ""

# ============================================================
# 6. .gitignore TEKSHIRUVI
# ============================================================
echo "🔒 .gitignore tekshirilmoqda..."

GITIGNORE_OK=true
for pattern in ".env*" "SESSION_LAST.md" "SESSION_HISTORY.md" ".miya/results/"; do
  if [ -f ".gitignore" ] && grep -q "$pattern" .gitignore 2>/dev/null; then
    :
  else
    GITIGNORE_OK=false
    break
  fi
done

if [ "$GITIGNORE_OK" = false ]; then
  warn ".gitignore da MiyaAI uchun kerakli qatorlar yo'q — qo'shilmoqda..."
  cat >> .gitignore << 'EOF'

# MiyaAI — session fayllar (personal, git da saqlanmaydi)
SESSION_LAST.md
SESSION_HISTORY.md
USER_PROFILE.md
.miya/results/
EOF
  ok ".gitignore yangilandi"
else
  ok ".gitignore to'g'ri"
fi
echo ""

# ============================================================
# 7. YAKUNIY HOLAT
# ============================================================
echo "╔══════════════════════════════════════╗"
echo "║           SETUP TUGADI ✅            ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Keyingi qadam — CLAUDE.md ni to'ldiring:"
echo ""
echo "  1. CLAUDE.md faylini oching"
echo "  2. MAJBURIY maydonlarni to'ldiring:"
echo "     → LOYIHA nomi va maqsadi"
echo "     → STACK (framework, DB, deploy)"
echo "     → PAPKA TUZILMASI"
echo "     → KODLASH QOIDALARI (kamida 5 ta)"
echo "     → HOZIRGI FAZA (1-MVP / 2-Growth / 3-Scale)"
echo ""
echo "  3. Claude Code oching:"
echo "     claude"
echo ""
echo "  4. Birinchi prompt:"
echo "     \"CLAUDE.md o'qi, loyiha holatini tekshir, tayyor bo'lsang ayt\""
echo ""
warn "MUHIM: CLAUDE.md to'ldirilmay MiyaAI ishlashni boshlayolmaydi"
echo ""
