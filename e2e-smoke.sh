#!/usr/bin/env bash
# E2E smoke-test: воспроизводит 10 шагов демо через curl
set -euo pipefail

BASE="http://localhost:8001/api"
OUT="/tmp/netwatt-smoke"
mkdir -p "$OUT"

echo "== 1. Login admin =="
LOGIN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tuit.uz","password":"admin1234"}')
ADMIN_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access_token'])")
echo "   admin logged in, token len=${#ADMIN_TOKEN}"

echo "== 2. Get /auth/me =="
curl -sf "$BASE/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; u=json.load(sys.stdin); print(f\"   {u['email']} role={u['role']}\")"

echo "== 3. Login engineer =="
ENG_LOGIN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@tuit.uz","password":"engineer1234"}')
ENG_TOKEN=$(echo "$ENG_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access_token'])")
echo "   engineer logged in"

echo "== 4. List equipment (50 models expected) =="
EQ_COUNT=$(curl -sf "$BASE/equipment?limit=500" -H "Authorization: Bearer $ENG_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])")
echo "   catalog total=$EQ_COUNT"
[ "$EQ_COUNT" -ge 50 ] || { echo "FAIL: expected >=50 models"; exit 1; }

echo "== 5. Find 4 specific models =="
SW1_ID=$(curl -sf "$BASE/equipment?q=9200L-24P" -H "Authorization: Bearer $ENG_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
SERVER_ID=$(curl -sf "$BASE/equipment?q=R650" -H "Authorization: Bearer $ENG_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
AP_ID=$(curl -sf "$BASE/equipment?q=AP-515" -H "Authorization: Bearer $ENG_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
MTK_ID=$(curl -sf "$BASE/equipment?q=CRS326" -H "Authorization: Bearer $ENG_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
echo "   switch=$SW1_ID server=$SERVER_ID ap=$AP_ID mikrotik=$MTK_ID"

echo "== 6. Create scenario with all 4 policies =="
SCENARIO=$(curl -sf -X POST "$BASE/scenarios" \
  -H "Authorization: Bearer $ENG_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Корпоративная сеть 120 портов\",
    \"notes\": \"ВКР ТУИТ 2026 demo\",
    \"tariff\": {\"day\": 1050, \"peak\": 1450, \"night\": 450, \"currency\": \"UZS\"},
    \"traffic\": {
      \"day_util\": 0.35, \"peak_util\": 0.70, \"night_util\": 0.05,
      \"day_hours\": 6, \"peak_hours\": 2, \"night_hours\": 16
    },
    \"policies\": {
      \"eee\":           {\"enabled\": true, \"eta\": 0.5},
      \"alr\":           {\"enabled\": true, \"drop\": 0.4},
      \"poe_sched\":     {\"enabled\": true, \"off_hours\": 12},
      \"consolidation\": {\"enabled\": true, \"min_servers\": 1, \"night_hours\": 8}
    },
    \"ef_grid\": 0.468,
    \"items\": [
      {\"equipment_id\": $SW1_ID, \"quantity\": 6},
      {\"equipment_id\": $SERVER_ID, \"quantity\": 2},
      {\"equipment_id\": $AP_ID, \"quantity\": 10},
      {\"equipment_id\": $MTK_ID, \"quantity\": 3}
    ]
  }")
SID=$(echo "$SCENARIO" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "   scenario id=$SID"

echo "== 7. Calculate =="
START=$(date +%s)
CALC=$(curl -sf -X POST "$BASE/scenarios/$SID/calculate" -H "Authorization: Bearer $ENG_TOKEN")
echo "   triggered: $CALC"

for i in $(seq 1 20); do
  STATUS=$(curl -sf "$BASE/scenarios/$SID" -H "Authorization: Bearer $ENG_TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  if [ "$STATUS" = "ready" ]; then
    ELAPSED=$(($(date +%s) - START))
    echo "   status=ready (took ${ELAPSED}s)"
    break
  fi
  if [ "$STATUS" = "failed" ]; then
    echo "FAIL: status=failed"
    exit 1
  fi
  sleep 0.5
done

echo "== 8. Fetch result =="
curl -sf "$BASE/scenarios/$SID" -H "Authorization: Bearer $ENG_TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d['result']
print(f\"   E_base     = {float(r['e_base_kwh']):>12,.0f} kWh/year\")
print(f\"   E_optimized= {float(r['e_optimized_kwh']):>12,.0f} kWh/year\")
print(f\"   savings    = {float(r['savings_kwh']):>12,.0f} kWh/year\")
print(f\"   money      = {float(r['savings_money']):>12,.0f} UZS/year\")
print(f\"   CO2 saved  = {float(r['co2_saved_kg']):>12,.1f} kg/year\")
print(f\"   breakdown  = EEE={r['breakdown']['eee']:.0f}  ALR={r['breakdown']['alr']:.0f}  PoE={r['breakdown']['poe']:.0f}  Consol={r['breakdown']['consolidation']:.0f}\")
print(f\"   per_device = {len(r['per_device'])} entries\")
"

echo "== 9. Download PDF (ru) =="
curl -sf "$BASE/scenarios/$SID/report.pdf?lang=ru" -H "Authorization: Bearer $ENG_TOKEN" -o "$OUT/scenario_${SID}_ru.pdf"
PDFSIZE=$(wc -c < "$OUT/scenario_${SID}_ru.pdf")
echo "   PDF ru: ${PDFSIZE} bytes"
[ "$PDFSIZE" -gt 20000 ] || { echo "FAIL: PDF too small"; exit 1; }

echo "== 9b. Download PDF (uz) =="
curl -sf "$BASE/scenarios/$SID/report.pdf?lang=uz" -H "Authorization: Bearer $ENG_TOKEN" -o "$OUT/scenario_${SID}_uz.pdf"
echo "   PDF uz: $(wc -c < "$OUT/scenario_${SID}_uz.pdf") bytes"

echo "== 10. Download XLSX =="
curl -sf "$BASE/scenarios/$SID/report.xlsx" -H "Authorization: Bearer $ENG_TOKEN" -o "$OUT/scenario_${SID}.xlsx"
echo "   XLSX: $(wc -c < "$OUT/scenario_${SID}.xlsx") bytes"

echo "== 11. Admin: list users =="
curl -sf "$BASE/users" -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; users=json.load(sys.stdin); print(f'   {len(users)} users: ' + ', '.join(u['email']+' ('+u['role']+')' for u in users))"

echo "== 12. Metrics =="
METRICS_COUNT=$(curl -sf "http://localhost:8001/api/metrics" | grep -c "^netwatt_http_requests_total" || true)
echo "   metric series: $METRICS_COUNT"

echo ""
echo "✓ All 12 smoke steps passed"
echo "Files in $OUT:"
ls -la "$OUT"/ | tail -5
