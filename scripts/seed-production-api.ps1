# Production serverga mahsulotlarni qo'shish skripti
$BASE_URL = "https://luxpetplast-api.onrender.com/api"

# Login
$loginBody = '{"login":"admin","password":"admin123"}'
$loginResp = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "✅ Login muvaffaqiyatli"

# Mavjud mahsulotlarni olish
$existing = Invoke-RestMethod -Uri "$BASE_URL/products?limit=500" -Method GET -Headers $headers
$existingNames = $existing.data | ForEach-Object { $_.name }
Write-Host "📦 Bazada mavjud: $($existingNames.Count) ta mahsulot"

# Barcha mahsulotlar ro'yxati
$products = @(
  # КАПСУЛА 15 гр
  @{ name='Капсула 15 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=18 },
  @{ name='Капсула 15 гр гидро'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=1 },
  @{ name='Капсула 15 гр синий'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=19 },
  @{ name='Капсула 15 гр sprite'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=17 },
  @{ name='Капсула 15 гр қизил'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=0 },
  @{ name='Капсула 15 гр кора'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=20000; pricePerPiece=0.285; pricePerBag=570; currentStock=0 },
  # КАПСУЛА 21 гр
  @{ name='Капсула 21 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=4 },
  @{ name='Капсула 21 гр гидро'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=15 },
  @{ name='Капсула 21 гр гд Октош'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=0 },
  @{ name='Капсула 21 гр синий'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=11 },
  @{ name='Капсула 21 гр sprite'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=1 },
  @{ name='Капсула 21 гр ёд'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=0 },
  @{ name='Капсула 21 гр ок'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=15000; pricePerPiece=0.04; pricePerBag=600; currentStock=0 },
  # КАПСУЛА 26 гр
  @{ name='Капсула 26 гр ёг'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=12000; pricePerPiece=0.0494; pricePerBag=593; currentStock=22 },
  # КАПСУЛА 30 гр
  @{ name='Капсула 30 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.057; pricePerBag=570; currentStock=18 },
  @{ name='Капсула 30 гр гидро'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.057; pricePerBag=570; currentStock=22 },
  @{ name='Капсула 30 гр гд Октош'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.057; pricePerBag=570; currentStock=0 },
  @{ name='Капсула 30 гр sprite'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.057; pricePerBag=570; currentStock=3 },
  @{ name='Капсула 30 гр синий'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.057; pricePerBag=570; currentStock=17 },
  # КАПСУЛА 36 гр
  @{ name='Капсула 36 гр ёг'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=10000; pricePerPiece=0.0685; pricePerBag=685; currentStock=30 },
  # КАПСУЛА 52 гр
  @{ name='Капсула 52 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=6000; pricePerPiece=0.0988; pricePerBag=593; currentStock=14 },
  @{ name='Капсула 52 гр ок'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=6000; pricePerPiece=0.0988; pricePerBag=593; currentStock=7 },
  # КАПСУЛА 70 гр
  @{ name='Капсула 70 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4500; pricePerPiece=0.133; pricePerBag=600; currentStock=0 },
  @{ name='Капсула 70 гр гидро'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4500; pricePerPiece=0.133; pricePerBag=600; currentStock=0 },
  @{ name='Капсула 70 гр сайхун'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4500; pricePerPiece=0.133; pricePerBag=600; currentStock=1 },
  @{ name='Капсула 70 гр синий'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4500; pricePerPiece=0.133; pricePerBag=600; currentStock=0 },
  # КАПСУЛА 75 гр
  @{ name='Капсула 75 гр праэрач'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.1425; pricePerBag=570; currentStock=18 },
  @{ name='Капсула 75 гр сайхун'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.1425; pricePerBag=570; currentStock=2 },
  @{ name='Капсула 75 гр гидро 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.1425; pricePerBag=570; currentStock=0 },
  @{ name='Капсула 75 гр гидро 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.1425; pricePerBag=427.5; currentStock=0 },
  @{ name='Капсула 75 гр синий 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.1425; pricePerBag=570; currentStock=29 },
  @{ name='Капсула 75 гр синий 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.1425; pricePerBag=427.5; currentStock=0 },
  # КАПСУЛА 80 гр
  @{ name='Капсула 80 гр праэрач 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.152; pricePerBag=608; currentStock=47 },
  @{ name='Капсула 80 гр праэрач 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.152; pricePerBag=456; currentStock=3 },
  @{ name='Капсула 80 гр гидро 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.152; pricePerBag=608; currentStock=0 },
  @{ name='Капсула 80 гр гидро 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.152; pricePerBag=456; currentStock=0 },
  @{ name='Капсула 80 гр сайхун 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.152; pricePerBag=608; currentStock=0 },
  @{ name='Капсула 80 гр сайхун 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.152; pricePerBag=456; currentStock=0 },
  @{ name='Капсула 80 гр синий 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.152; pricePerBag=608; currentStock=1 },
  @{ name='Капсула 80 гр синий 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.152; pricePerBag=456; currentStock=0 },
  # КАПСУЛА 85 гр
  @{ name='Капсула 85 гр праэрач 3000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.1615; pricePerBag=484.5; currentStock=0 },
  @{ name='Капсула 85 гр праэрач 4000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=4000; pricePerPiece=0.1615; pricePerBag=646; currentStock=2 },
  # КАПСУЛА 86 гр
  @{ name='Капсула 86 гр праэрач А'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.1634; pricePerBag=490.2; currentStock=0 },
  @{ name='Капсула 86 гр праэрач Б'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=3000; pricePerPiece=0.1634; pricePerBag=490.2; currentStock=1 },
  # КАПСУЛА 135 гр
  @{ name='Капсула 135 гр праэрач 2500'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2500; pricePerPiece=0.2565; pricePerBag=641.25; currentStock=0 },
  @{ name='Капсула 135 гр праэрач 2000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2000; pricePerPiece=0.2565; pricePerBag=513; currentStock=0 },
  @{ name='Капсула 135 гр гидро 2500'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2500; pricePerPiece=0.2565; pricePerBag=641.25; currentStock=16 },
  @{ name='Капсула 135 гр гидро 2000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2000; pricePerPiece=0.2565; pricePerBag=513; currentStock=0 },
  @{ name='Капсула 135 гр сайхун'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2500; pricePerPiece=0.2565; pricePerBag=641.25; currentStock=1 },
  @{ name='Капсула 135 гр сайхун +'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2500; pricePerPiece=0.2565; pricePerBag=641.25; currentStock=0 },
  @{ name='Капсула 135 гр синий 2500'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2500; pricePerPiece=0.2565; pricePerBag=641.25; currentStock=29 },
  @{ name='Капсула 135 гр синий 2000'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2000; pricePerPiece=0.2565; pricePerBag=513; currentStock=0 },
  # КАПСУЛА 250 гр
  @{ name='Капсула 250 гр нестле'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2000; pricePerPiece=0; pricePerBag=0; currentStock=0 },
  @{ name='Капсула 250 гр синий'; bagType='KAPSULA'; warehouse='kapsula'; unitsPerBag=2000; pricePerPiece=0; pricePerBag=0; currentStock=0 },
  # КРИШКА 28мм
  @{ name='Кришка 28 кук газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 галубой газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 сарик газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 яшил газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 қизил газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 ок'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  @{ name='Кришка 28 кора газ'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.007; pricePerBag=42; currentStock=0 },
  # КРИШКА 28мм — ДКМ
  @{ name='Кришка 28 ДКМ сарик'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=4000; pricePerPiece=0.013; pricePerBag=52; currentStock=0 },
  @{ name='Кришка 28 ДКМ кук 10000'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=10000; pricePerPiece=0.013; pricePerBag=130; currentStock=0 },
  @{ name='Кришка 28 ДКМ кук 6000'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=6000; pricePerPiece=0.013; pricePerBag=78; currentStock=0 },
  @{ name='Кришка 28 ДКМ яшил'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=4000; pricePerPiece=0.013; pricePerBag=52; currentStock=0 },
  # РУЧКА 28мм
  @{ name='Ручка 28 сарик 1500'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1500; pricePerPiece=0.009; pricePerBag=13.5; currentStock=0 },
  @{ name='Ручка 28 сарик 2500'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2500; pricePerPiece=0.009; pricePerBag=22.5; currentStock=0 },
  # КРИШКА 38мм
  @{ name='Кришка 38 кук'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=88 },
  @{ name='Кришка 38 галубой'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=0 },
  @{ name='Кришка 38 сарик'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=90 },
  @{ name='Кришка 38 яшил'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=9 },
  @{ name='Кришка 38 сайхун'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=34 },
  @{ name='Кришка 38 қизил'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=50 },
  @{ name='Кришка 38 ок'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=3000; pricePerPiece=0.010; pricePerBag=30; currentStock=40 },
  # РУЧКА 38мм
  @{ name='Ручка 38 кук'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=167 },
  @{ name='Ручка 38 галубой'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=0 },
  @{ name='Ручка 38 сарик'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=44 },
  @{ name='Ручка 38 яшил'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=23 },
  @{ name='Ручка 38 сайхун'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=30 },
  @{ name='Ручка 38 қизил'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=25 },
  @{ name='Ручка 38 ок'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=2000; pricePerPiece=0.015; pricePerBag=30; currentStock=35 },
  # КРИШКА 48мм
  @{ name='Кришка 48 кук'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=70 },
  @{ name='Кришка 48 галубой'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=8 },
  @{ name='Кришка 48 сарик'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=75 },
  @{ name='Кришка 48 Доня'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=44 },
  @{ name='Кришка 48 Бекажон'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=0 },
  @{ name='Кришка 48 яшил'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=89 },
  @{ name='Кришка 48 апелсин'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=144 },
  @{ name='Кришка 48 қизил'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=38 },
  @{ name='Кришка 48 сайхун'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=0 },
  @{ name='Кришка 48 салат'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=5 },
  @{ name='Кришка 48 ок'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=2000; pricePerPiece=0.018; pricePerBag=36; currentStock=86 },
  # РУЧКА 48мм
  @{ name='Ручка 48 кук'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=22 },
  @{ name='Ручка 48 галубой'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=24 },
  @{ name='Ручка 48 сарик'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=91 },
  @{ name='Ручка 48 апелсин'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=-1 },
  @{ name='Ручка 48 яшил'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=98 },
  @{ name='Ручка 48 сайхун'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=13 },
  @{ name='Ручка 48 қизил'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=50 },
  @{ name='Ручка 48 ок'; bagType='RUCHKA'; warehouse='ruchka'; unitsPerBag=1000; pricePerPiece=0.012; pricePerBag=12; currentStock=116 },
  # КРИШКА 55мм
  @{ name='Кришка 55 кук'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=1000; pricePerPiece=0; pricePerBag=0; currentStock=0 },
  @{ name='Кришка 55 ок'; bagType='KRISHKA'; warehouse='krishka'; unitsPerBag=1000; pricePerPiece=0; pricePerBag=0; currentStock=0 }
)

$added = 0
$skipped = 0
$errors = 0

foreach ($p in $products) {
  if ($existingNames -contains $p.name) {
    Write-Host "  ⏭  Mavjud: $($p.name)"
    $skipped++
    continue
  }

  $body = @{
    name         = $p.name
    bagType      = $p.bagType
    warehouse    = $p.warehouse
    unitsPerBag  = $p.unitsPerBag
    pricePerPiece = $p.pricePerPiece
    pricePerBag  = $p.pricePerBag
    currentStock = $p.currentStock
    currentUnits = $p.currentStock * $p.unitsPerBag
    minStockLimit = 5
    optimalStock = 20
    maxCapacity  = 200
    active       = $true
  } | ConvertTo-Json

  try {
    Invoke-RestMethod -Uri "$BASE_URL/products" -Method POST -Body $body -Headers $headers | Out-Null
    Write-Host "  ✅ Qoshildi: $($p.name) ($($p.currentStock) qop)"
    $added++
  } catch {
    Write-Host "  ❌ Xato: $($p.name) - $($_.Exception.Message)"
    $errors++
  }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ Yangi qoshildi : $added ta"
Write-Host "⏭  O'tkazib yuborildi: $skipped ta"
Write-Host "❌ Xatolar: $errors ta"
