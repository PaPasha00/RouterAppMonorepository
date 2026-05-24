# Высоты вне России / один источник

Раньше на части маршрутов (типа Эверест) приходили нули — упирались в один elevation API без fallback.

Сейчас в `be/src/services/elevationService.ts` цепочка: OpenTopoData SRTM → ASTER → OpenElevation. Если все отвалились — региональная заглушка по координатам (Гималаи, Альпы и т.д.), см. код.

Проверка с Mac:

```bash
cd be
npm run dev
node test-elevation.js
```

В логах бэка: `Requesting elevation data`, `min=… max=…`.
