# MiyaAI TIZIMI — v5.0
## Claude Code bilan Professional Loyiha Boshqarish

---

## NIMA O'ZGARDI (v5.0 → v5.7)

```
✅ setup.sh         — bir komanda bilan to'liq infratuzilma sozlanadi
                      (hooks, permissions, memory fayllar, .gitignore)
✅ FUNCTIONS bo'lindi — bir 12K token fayl → T1/T2/T3 (82% token tejash)
✅ CLAUDE.md        — TIER yuklanish tartibi shablonga qo'shildi
✅ NEXT_CHAT_PROMPT — v5.7 ga yangilandi (v4.6 emas)
✅ DataMigrationAI  — MEDIUM/LARGE zanjirga kiritildi
✅ RefactorAI       — alohida REFACTOR SPRINT zanjiri
✅ RUNBOOK          — TIER 3 incident trigger + VersionControlAI
✅ F88              — Agent JSON output validation
✅ F89              — Feature flag auto-register
✅ Faza fallback    — faza noaniq bo'lsa agent bloklanadi, so'raladi
✅ USER_PROFILE     — har sessiyada 2 qator micro-read (30 token)
```

## NIMA O'ZGARDI (v4.5 → v5.0)

```
QO'SHILDI — 20 ta yangi funksiya (F65–F84):

GURUH N — QAROR SIFATI (F65–F70):
  F65: Breaking Change Detector    — DB o'zgarganda sahifalar tekshiriladi
  F66: Structured Agent Handoff    — Agentlar o'rtasida aniq ma'lumot
  F67: Incomplete Work Resume      — Copy-paste tayyor resume prompt
  F68: Contradiction Detector      — AI oldingi qarorlari bilan zid gapirmasin
  F69: Assumption Expiry Tracker   — Taxminlar muddati kuzatiladi
  F70: Confidence Degradation      — Eski qarorlar avtomatik eskiradi

GURUH O — SESSIYA BOSHQARUVI (F71–F73):
  F71: Cold Start Detector         — 7+ kun tanaffusdan keyin to'g'ri boshlash
  F72: Scope Creep Early Warning   — Scope kengayishidan OLDIN ogohlantirish
  F73: Energy Budget Tracker       — Sessiya murakkablik limiti kuzatiladi

GURUH P — AGENT SIFATI (F74–F76):
  F74: Hallucination Pattern Memory — Bir xil xato qayta bo'lmasin
  F75: Agent Output Diff            — Qarama-qarshi o'zgarish ushlanadi
  F76: Partial Success Handler      — "Partial" natija aniq boshqariladi

GURUH Q — LOYIHA SOG'LIGI (F77–F79):
  F77: Tech Debt Auto-Detector     — Qarz belgilari avtomatik topiladi
  F78: Feature Flag Lifecycle      — Flaglar eskirib qolmasin
  F79: Dependency Vulnerability    — Paketlar eskirgani sezilsin

GURUH R — FOYDALANUVCHI VA ARXITEKTURA (F80–F84):
  F80: User Pattern Learning       — Har sessiyada micro-pattern to'planadi
  F81: Decision Fatigue Detector   — Ko'p savol berma, foydalanuvchi charchasin
  F82: Silent Progress Indicator   — Uzoq zanjirda holat ko'rsatiladi
  F83: ADR Reuse                   — Eski qarorlar qayta ishlatiladi
  F84: Cross-Page Impact Analyzer  — Shared komponent o'zgarganda kaskad

ISHLASH TARTIBI: v4.0 → v5.0
  Eski: umumiy ro'yxat (64 funksiya qayerda — noma'lum)
  Yangi: 10 qadam formati (har funksiya qaysi qadamda — aniq)

    QADAM 0: Sessiya ochilishi (Cold Start, Expiry, Degradation)
    QADAM 1: Prompt qabul va tozalash (F1, F2, F83)
    QADAM 2: Kontekst va ziddiyat (F3, F14, F12, F17, F68)
    QADAM 3: Xavf va scope (F4, F18, F51, F19, F72)
    QADAM 4: Chuqur tahlil (F13, F23, F25, F53, F65, F84)
    QADAM 5: Qaror va reja (F48, F49, F50, F20, F81)
    QADAM 6: "Ha" kutiladi
    QADAM 7: Execution tayyorlash (F24-F28, F73, F82)
    QADAM 8: Execution — agentlar (F74-F77, F66, F76)
    QADAM 9: Memory yangilash (F31-F35, F59, F60, F67)
    QADAM 10: Sessiya yakunlash (F55, F58, F80)
```

---

```
KERAKSIZ KONTEKST TOZALANDI:
  MiyaAI.md:          2891 → 2162 qator (-729, ~2900 token tejaldi)
  BackendBuilderAI.md: 1661 → 1361 qator (-300, ~1200 token tejaldi)
  Jami: ~4100 token tejaldi

O'CHIRILGANLAR (takror va eskirgan):
  - SYSTEM IMPACT v3.3 (v3.4 da to'liq versiyasi bor)
  - HAQIQIY KAMCHILIKLAR v3.8 (tarix, Claude uchun foydasiz)
  - MEMORY FAYLLARI eski ro'yxat (13 ta saqlanib, to'liq versiyasi bor)
  - YANGILANGAN UNIVERSAL QOIDA v3.7 (bosh bo'lim yangilandi)
  - PROFESSIONAL METODOLOGIYALAR to'liq matni (faqat tavsiya jadvali saqlandi)
  - BackendBuilderAI: eski ISHLASH TARTIBI, v3.3, v3.4, v3.6 takrorlari

UNIVERSAL QOIDA: 7 ta → 10 ta (8.SINXRON, 9.BOG'LIQ, 10.IZCHIL qo'shildi)
```

---

## NIMA O'ZGARDI (v4.3 → v4.4)

```
1. docs/SETUP.md yaratildi (310 qator):
   - .claude/settings.json — permission system
   - .claude/hooks/ — PreToolUse/PostToolUse skriptlar
   - MCP serverlar — Supabase, GitHub, Playwright
   - --continue va --resume ishlatish
   - Birinchi marta sozlash tartibi (6 qadam)

2. MiyaAI da MCP shart:
   - Supabase MCP ulangan → SCHEMA_SNAPSHOT.md o'qilmaydi
   - GitHub MCP ulangan → commit/PR to'g'ridan
   - Hooks bor → checksum avtomatik, yo'q → qo'lda
```

---

## NIMA O'ZGARDI (v4.2 → v4.3)

```
1. CLAUDE.md KUCHAYTIRILDI
   - Majburiy maydonlar aniq belgilandi (5 ta shart)
   - Agent validation: 5 savol javobsiz → PAUSE
   - CLAUDE.md yo'q bo'lsa → onboarding rejimi

2. AGENT NATIJA STANDARTI
   - Barcha agentlar: meta + data wrapper
   - meta.status: success | partial | failed
   - meta.blocked: keyingi agent bloki
   - MiyaAI meta orqali taqqoslaydi va zanjir boshqaradi
   - files_changed orqali agentlar faqat kerakli fayllarni oladi
```

---

## NIMA O'ZGARDI (v4.1 → v4.2)

```
1. SCHEMA_SNAPSHOT.md  — DB holati bir joyda (migration stack o'qilmaydi)
2. INCOMPLETE_WORK.md  — tugallanmagan feature tracking
3. SPRINT_PLAN.md      — sprint reja va scope creep nazorat
4. MiyaAI funksiya 61  — 48 dan 61 ga (59: Schema, 60: Incomplete, 61: Sprint)
5. Smart loading       — yangi fayllar vazifaga qarab yuklanadi
```

---

## NIMA O'ZGARDI (v4.0 → v4.1)

```
1. MiyaAI.md TOZALANDI   — Ziddiyatli eski bo'limlar o'chirildi (~330 qator)
2. MEMORY 13 ta          — PAGE_REGISTRY to'g'ri hisoblandi (12 emas)
3. PERSISTENCE ANIQ      — Har agentda buyruq ko'rsatildi (mkdir + cat)
4. FRONTEND MODULLANDI   — 05b_FrontendBuilderAI_testing.md ajratildi
5. CONFIDENCE FORMULA    — 5 mezon × 20 ball = 0-100 aniq hisob
6. ZANJIR v4.0           — YANGILANGAN ZANJIR v3.0 o'chirildi
```

---

## TARKIB

### /skills — 17 ta Fayl (11 agent + 6 modul)

```
01_MiyaAI.md                        ← Markaziy miya (v4.1)
02_PromptRefinerAI.md               ← Prompt sifatini oshirish
03_FullStackBuilderAI.md            ← Kichik-o'rta loyiha
04_BackendBuilderAI.md              ← Backend (CORE — har doim)
04b_BackendBuilderAI_devops.md      ← Backend (faqat deploy sessiyasida)
04c_BackendBuilderAI_ai.md          ← Backend (faqat AI sessiyasida)
04d_BackendBuilderAI_monitoring.md  ← Backend (faqat monitoring sessiyasida)
04e_BackendBuilderAI_testing.md     ← Backend (faqat test sessiyasida)
04f_BackendBuilderAI_protocols.md   ← Backend (murakkab multi-agent sessiyada)
05_FrontendBuilderAI.md             ← Frontend (CORE — har doim)
05b_FrontendBuilderAI_testing.md    ← Frontend (faqat test sessiyasida)
06_IntegrationTesterAI.md           ← Moslik tekshirish
07_BackendSecurityTesterAI.md       ← Xavfsizlik (static code analysis)
08_PerformanceAI.md                 ← Tezlik tekshirish
09_FrontendUXTesterAI.md            ← UX tekshirish
10_DocumentationAI.md               ← Hujjat yozish
11_VersionControlAI.md              ← Versiyalash va deploy
```

### /templates — 15 ta Memory Fayl

```
CLAUDE.md          PROJECT.md         TODO.md
STATUS.md          DECISION_LOG.md    SESSION_LAST.md
ASSUMPTIONS.md     USER_PROFILE.md    ANTI_PATTERNS.md
TECH_DEBT.md       RISK_REGISTER.md   DEPENDENCY_MAP.md
PAGE_REGISTRY.md   ADR_TEMPLATE.md    FEATURE_FLAGS.md
SCHEMA_SNAPSHOT.md INCOMPLETE_WORK.md SPRINT_PLAN.md
```

### /docs — 3 ta Qo'llanma

```
CLAUDE_PROFESSIONAL_GUIDE.md  ← Claude bilan ishlash uslubi
WORKFLOWS.md                  ← 7 ta ish jarayoni
SETUP.md                      ← Hooks, MCP, Permission sozlash
```

---

## SMART LOADING

```
Yangi feature       → 01 + 04(core) + 05(core)             = ~18K token
Multi-agent/Audit   → 01 + 04(core) + 04f + 07              = ~22K token
Bug fix        → 01 + 04(core) + 06               = ~12K token
Deploy         → 01 + 04b + 11                    = ~8K token
AI sessiya     → 01 + 04(core) + 04c              = ~10K token
Monitoring     → 01 + 04d + 08                    = ~9K token
Test yozish    → 01 + 04e + 05b + 06              = ~10K token
To'liq zanjir  → Barcha fayllar ketma-ket
```

---

## ZANJIR UZUNLIGI

```
MICRO  (1 fayl, DB yo'q)      → MiyaAI → FullStack → commit
SMALL  (1-3 fayl, 1 field)    → + IntegrationTester
MEDIUM (3-8 fayl, 1-2 jadval) → [DataMigrationAI] → + Security
LARGE  (8+ fayl, ko'p jadval) → [DataMigrationAI] → To'liq zanjir
⚡ [DataMigrationAI] — faqat DB o'zgarsa ishga tushadi
```

---

## TEZKOR BOSHLASH

```bash
# 1. Loyiha papkasiga o'ting
cd /your-project/

# 2. MiyaAI papkasini ko'chiring
cp -r /path/to/miya-v5/* .

# 3. Bir marta setup
bash setup.sh

# 4. CLAUDE.md ni to'ldiring (majburiy maydonlar)
# Keyin Claude Code oching:
claude

# 5. Birinchi prompt:
"CLAUDE.md o'qi, loyiha holatini tekshir, tayyor bo'lsang ayt"
```

`setup.sh` nima qiladi:
- `.claude/hooks/` — 3 ta avtomatik tekshiruv (TS, migration, snapshot)
- `.claude/settings.json` — ruxsatlar (nima mumkin, nima emas)
- Memory fayllar — `templates/` dan ko'chiradi (mavjudlari o'tkazib yuboriladi)
- `.gitignore` — session fayllarni git dan chiqaradi

---

## CONFIDENCE SCORE (0-100)

```
Arxitektura moslik   [0-20]
Ziddiyat yo'qligi   [0-20]
Test qulayligi      [0-20]
Rollback imkoni     [0-20]
Effort/Foyda nisbat [0-20]
─────────────────────────
Jami                [0-100]
```
