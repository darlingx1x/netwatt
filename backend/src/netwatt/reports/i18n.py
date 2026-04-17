TRANSLATIONS: dict[str, dict[str, str]] = {
    "ru": {
        "report_title": "NetWatt — отчёт по сценарию",
        "report_prepared": "Подготовлен:",
        "scenario": "Сценарий",
        "owner": "Владелец",
        "kpi_section": "Ключевые показатели",
        "inputs_section": "Входные параметры",
        "policies_section": "Политики оптимизации",
        "per_device_section": "Разбивка по устройствам",
        "kpi_savings_kwh": "Экономия энергии",
        "kpi_savings_money": "Экономия средств",
        "kpi_co2": "Снижение CO₂",
        "param": "Параметр",
        "value": "Значение",
        "tariff_day": "Тариф день",
        "tariff_peak": "Тариф пик",
        "tariff_night": "Тариф ночь",
        "day_util": "Загрузка день",
        "peak_util": "Загрузка пик",
        "night_util": "Загрузка ночь",
        "ef_grid": "Коэффициент выбросов сети",
        "policy": "Политика",
        "status": "Статус",
        "vendor": "Вендор",
        "model": "Модель",
        "qty": "Кол-во",
        "unit_kwh_year": "кВт·ч/год",
        "unit_uzs_year": "сум/год",
        "unit_kg_year": "кг/год",
        "unit_kwh": "кВт·ч",
        "unit_kg_per_kwh": "кг/кВт·ч",
        "legal_title": "Правовая база Республики Узбекистан",
        "legal_text": (
            "ЗРУ-628 «Об использовании возобновляемых источников энергии». "
            "УП-158 от 27.08.2019 «Об ускоренном развитии экспортоориентированной электроэнергетики». "
            "ПП-4422 «О мерах по повышению энергоэффективности». "
            "Коэффициент эмиссии EF_grid = 0.468 кг CO₂/кВт·ч (МЭ РУз, 2024)."
        ),
    },
    "uz": {
        "report_title": "NetWatt — stsenariy bo'yicha hisobot",
        "report_prepared": "Tayyorlandi:",
        "scenario": "Stsenariy",
        "owner": "Egasi",
        "kpi_section": "Asosiy ko'rsatkichlar",
        "inputs_section": "Kirish parametrlari",
        "policies_section": "Optimallashtirish siyosatlari",
        "per_device_section": "Qurilmalar bo'yicha taqsimot",
        "kpi_savings_kwh": "Energiya tejash",
        "kpi_savings_money": "Mablag' tejash",
        "kpi_co2": "CO₂ kamaytirish",
        "param": "Parametr",
        "value": "Qiymat",
        "tariff_day": "Kunduzgi tarif",
        "tariff_peak": "Pik tarifi",
        "tariff_night": "Tungi tarif",
        "day_util": "Kunduzgi yuklanish",
        "peak_util": "Pik yuklanish",
        "night_util": "Tungi yuklanish",
        "ef_grid": "Tarmoq emissiya koeffitsienti",
        "policy": "Siyosat",
        "status": "Holat",
        "vendor": "Ishlab chiqaruvchi",
        "model": "Model",
        "qty": "Soni",
        "unit_kwh_year": "kVt·s/yil",
        "unit_uzs_year": "so'm/yil",
        "unit_kg_year": "kg/yil",
        "unit_kwh": "kVt·s",
        "unit_kg_per_kwh": "kg/kVt·s",
        "legal_title": "O'zbekiston Respublikasi huquqiy bazasi",
        "legal_text": (
            "O'RQ-628 «Qayta tiklanadigan energiya manbalaridan foydalanish to'g'risida». "
            "PF-158 «Eksportga yo'naltirilgan elektroenergetikani jadal rivojlantirish». "
            "PQ-4422 «Energiya samaradorligini oshirish». "
            "Emissiya koeffitsienti EF_grid = 0.468 kg CO₂/kVt·s (O'zR EV, 2024)."
        ),
    },
    "en": {
        "report_title": "NetWatt — scenario report",
        "report_prepared": "Prepared:",
        "scenario": "Scenario",
        "owner": "Owner",
        "kpi_section": "Key indicators",
        "inputs_section": "Inputs",
        "policies_section": "Optimization policies",
        "per_device_section": "Per-device breakdown",
        "kpi_savings_kwh": "Energy saved",
        "kpi_savings_money": "Money saved",
        "kpi_co2": "CO₂ reduced",
        "param": "Parameter",
        "value": "Value",
        "tariff_day": "Day tariff",
        "tariff_peak": "Peak tariff",
        "tariff_night": "Night tariff",
        "day_util": "Day utilization",
        "peak_util": "Peak utilization",
        "night_util": "Night utilization",
        "ef_grid": "Grid emission factor",
        "policy": "Policy",
        "status": "Status",
        "vendor": "Vendor",
        "model": "Model",
        "qty": "Qty",
        "unit_kwh_year": "kWh/year",
        "unit_uzs_year": "UZS/year",
        "unit_kg_year": "kg/year",
        "unit_kwh": "kWh",
        "unit_kg_per_kwh": "kg/kWh",
        "legal_title": "Republic of Uzbekistan — legal framework",
        "legal_text": (
            "Law ZRU-628 «On the use of renewable energy sources». "
            "Presidential Decree UP-158 on accelerated development of export-oriented electricity. "
            "Resolution PP-4422 on energy-efficiency measures. "
            "Grid emission factor EF_grid = 0.468 kg CO₂/kWh (Ministry of Energy of Uzbekistan, 2024)."
        ),
    },
}


def translate(lang: str) -> dict[str, str]:
    return TRANSLATIONS.get(lang, TRANSLATIONS["ru"])
