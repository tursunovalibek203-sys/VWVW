# Mijozlar USD qarzini o'rnatish skripti
# Dollar bo'limi - 30.06.2026 balansi asosida

$BASE_URL = "https://luxpetplast-api.onrender.com/api"

# Login
Write-Host "🔐 Login bo'linmoqda..."
$loginBody = '{"login":"admin","password":"admin123"}'
$loginResp = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.token
if (-not $token) { Write-Host "❌ Login muvaffaqiyatsiz"; exit 1 }
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "✅ Login muvaffaqiyatli"

# Barcha mavjud mijozlarni olish
Write-Host "📋 Mavjud mijozlar yuklanmoqda..."
$allCustomers = @()
$page = 1
do {
    $resp = Invoke-RestMethod -Uri "$BASE_URL/customers?limit=500&page=$page" -Method GET -Headers $headers
    $batch = if ($resp.data) { $resp.data } elseif ($resp -is [array]) { $resp } else { @() }
    $allCustomers += $batch
    $page++
} while ($batch.Count -eq 500)
Write-Host "✅ Jami $($allCustomers.Count) ta mijoz topildi"

# 81 ta dollar mijozi va ularning USD qarzlari
$customers = @(
    @{ name='Фахри ака ег'; debtUSD=7941 },
    @{ name='Мухташам оил'; debtUSD=63026 },
    @{ name='Охун ег'; debtUSD=46969 },
    @{ name='Шахи ака ег-Гиждувон'; debtUSD=12396 },
    @{ name='Шахи ег-Секрет'; debtUSD=21996 },
    @{ name='Шахи ака ег-Тошкент 1111'; debtUSD=15207 },
    @{ name='Шамси ака ег-Тошкент домл'; debtUSD=42216 },
    @{ name='Шамси ака-Фарход ака 1125'; debtUSD=0 },
    @{ name='Шамси ака ег-Бухоро'; debtUSD=8000 },
    @{ name='Уткир ака ёг'; debtUSD=0 },
    @{ name='Туйка ака Морс'; debtUSD=33933 },
    @{ name='Eco Water'; debtUSD=113932.6 },
    @{ name='Балиқчи масла завод'; debtUSD=43032 },
    @{ name='Оҳангарон масло завод'; debtUSD=90609 },
    @{ name='Косон масло завод'; debtUSD=10888 },
    @{ name='Жонибек Нукус-Муздек сум'; debtUSD=75660 },
    @{ name='Шухрат ака Тоткент'; debtUSD=4968 },
    @{ name='Обидхон ака НАМАНГАН'; debtUSD=59916 },
    @{ name='Фаррух ака Ромитан'; debtUSD=5500 },
    @{ name='Ифтихор Андижон'; debtUSD=7456 },
    @{ name='Бахром ака Шахрисабз'; debtUSD=3110 },
    @{ name='Мумин ака Морс'; debtUSD=68819 },
    @{ name='Aquarius'; debtUSD=24818 },
    @{ name='Шерзод ака Марғилон'; debtUSD=61800.5 },
    @{ name='БЕКАЖОН'; debtUSD=17564 },
    @{ name='EVER-MAC CALDO'; debtUSD=1496 },
    @{ name='Daily'; debtUSD=23451 },
    @{ name='Atlantis'; debtUSD=16735 },
    @{ name='Фарход Эллик қалъа'; debtUSD=2754 },
    @{ name='Навоий-Solis'; debtUSD=3805 },
    @{ name='Навоий-Paxtachi'; debtUSD=4748 },
    @{ name='ZAM-ZAM'; debtUSD=43000 },
    @{ name='Абдусамад'; debtUSD=43399.5 },
    @{ name='Элёр гел'; debtUSD=8205 },
    @{ name='Emir water'; debtUSD=1194 },
    @{ name='Равшан ака Бухоро'; debtUSD=1071.5 },
    @{ name='Ҳамдам гел'; debtUSD=4493.3 },
    @{ name='Кузи ожизлар'; debtUSD=9064.5 },
    @{ name='Himolife'; debtUSD=2529 },
    @{ name='Зоҳид ака выдувной'; debtUSD=9759 },
    @{ name='Aqua Gold'; debtUSD=0 },
    @{ name='ZILOL SUV'; debtUSD=487 },
    @{ name='Smart'; debtUSD=3649.5 },
    @{ name='Моҳи аъло'; debtUSD=5100 },
    @{ name='Мухтор ота'; debtUSD=970 },
    @{ name='Ecolife-Каҳрамон'; debtUSD=672 },
    @{ name='Termiz 8881'; debtUSD=6647 },
    @{ name='Шоҳжаҳон Карши'; debtUSD=8104 },
    @{ name='Жондор гел Сухроб ака'; debtUSD=1456 },
    @{ name='VeVa'; debtUSD=5049 },
    @{ name='Дилшод-Астарбоб'; debtUSD=1080 },
    @{ name='Али Навоий капсула'; debtUSD=0 },
    @{ name='Абдувоҳид ака'; debtUSD=13610.5 },
    @{ name='Охунни жураси-Саид ака'; debtUSD=3456 },
    @{ name='Термиз 77-27 Музаффар ака'; debtUSD=7306 },
    @{ name='Хуршид ака масло завод'; debtUSD=0 },
    @{ name='Миша ака'; debtUSD=14397 },
    @{ name='Азиз ака Шахрисабз'; debtUSD=5008 },
    @{ name='Мурод ака Марғилон'; debtUSD=2700 },
    @{ name='Ганишер ака Карши'; debtUSD=0 },
    @{ name='Файзулло Борига барака'; debtUSD=1592 },
    @{ name='Карши гел-Бек ака'; debtUSD=4861 },
    @{ name='Зангиота-Сирож'; debtUSD=10431 },
    @{ name='Феруз ака Карши'; debtUSD=0 },
    @{ name='Фахриддин ака водий'; debtUSD=38196 },
    @{ name='Хоразм-Дилшод ака'; debtUSD=7314 },
    @{ name='Хоразм Шавкат ака'; debtUSD=3220 },
    @{ name='Навоий гел'; debtUSD=0 },
    @{ name='Олот ёг'; debtUSD=1110 },
    @{ name='Fis'; debtUSD=50 },
    @{ name='Нукус янги клиент'; debtUSD=6798 },
    @{ name='ТОТКЕНТ СОВУН'; debtUSD=0 },
    @{ name='Садбарг'; debtUSD=1971 },
    @{ name='Е-вита'; debtUSD=0 },
    @{ name='Гиждувон-КУКУРУЗ'; debtUSD=0 },
    @{ name='Тожигистон Салих ака'; debtUSD=0 },
    @{ name='Sof water'; debtUSD=0 },
    @{ name='Эркин ака янги йул'; debtUSD=2873 },
    @{ name='GARDEN'; debtUSD=2472 },
    @{ name='Жонибек ака Термиз'; debtUSD=0 },
    @{ name='Barg-Sarvar'; debtUSD=0 }
)

$created = 0
$updated = 0
$errors  = 0

foreach ($c in $customers) {
    # Mavjud mijozni nom bo'yicha qidirish (to'liq nom yoki qismiy)
    $found = $allCustomers | Where-Object { $_.name -eq $c.name } | Select-Object -First 1

    # Agar topilmasa, qismiy mos kelishni tekshirish
    if (-not $found) {
        $found = $allCustomers | Where-Object {
            $_.name -and ($_.name.ToLower().Contains($c.name.ToLower().Substring(0, [Math]::Min(8, $c.name.Length))))
        } | Select-Object -First 1
    }

    if ($found) {
        # Mavjud mijozni yangilash
        $body = @{ debtUSD = $c.debtUSD } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$BASE_URL/customers/$($found.id)" -Method PUT -Body $body -Headers $headers | Out-Null
            Write-Host "✅ YANGILANDI: $($found.name) → debtUSD=$($c.debtUSD)"
            $updated++
        } catch {
            Write-Host "❌ XATOLIK yangilashda: $($found.name) - $_"
            $errors++
        }
    } else {
        # Yangi mijoz yaratish
        $createBody = @{
            name  = $c.name
            phone = '+998000000000'
            category = 'VIP'
        } | ConvertTo-Json -Depth 2

        try {
            $newCustomer = Invoke-RestMethod -Uri "$BASE_URL/customers" -Method POST -Body $createBody -Headers $headers
            $newId = if ($newCustomer.id) { $newCustomer.id } elseif ($newCustomer.customer) { $newCustomer.customer.id } else { $null }

            if ($newId) {
                $debtBody = @{ debtUSD = $c.debtUSD } | ConvertTo-Json
                Invoke-RestMethod -Uri "$BASE_URL/customers/$newId" -Method PUT -Body $debtBody -Headers $headers | Out-Null
                Write-Host "➕ YARATILDI: $($c.name) → debtUSD=$($c.debtUSD)"
                $created++
                # Yangi mijozni ro'yxatga qo'shish (keyingi iteratsiyalar uchun)
                $allCustomers += @{ id = $newId; name = $c.name }
            }
        } catch {
            Write-Host "❌ XATOLIK yaratishda: $($c.name) - $_"
            $errors++
        }
    }
}

Write-Host ""
Write-Host "═══════════════════════════════"
Write-Host "✅ Yangilandi : $updated ta"
Write-Host "➕ Yaratildi  : $created ta"
Write-Host "❌ Xatoliklar : $errors ta"
Write-Host "═══════════════════════════════"
