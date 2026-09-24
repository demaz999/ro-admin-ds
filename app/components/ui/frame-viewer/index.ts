export { default as FrameBindBar } from './FrameBindBar.vue'
export { default as FrameMeta } from './FrameMeta.vue'
export { default as FrameStage } from './FrameStage.vue'
export { default as FrameStatus } from './FrameStatus.vue'

/**
 * Полноэкранный просмотр кадра — экран «Распределение свободной съёмки» (VA-9265), такт 34.
 * **Мастера в Figma нет**: источник — прототип v17 (`#lb`, `renderLB`, `lbSuggest`,
 * `flashBind`) и спека §11.1–11.6. Разбор с замерами — `docs/free-shoot.md`, раздел 12.
 *
 * Каркас — `Lightbox` кита со слотом боковой панели `aside` (решение владельца 1, такт 34):
 * кадр с плашкой — `FrameStage` + `FrameBindBar` в слоте кадра, имя файла и `FrameStatus` —
 * в слоте действий, `FrameMeta` и список шагов такта 33 — в боковой панели.
 *
 * ## Нижняя плашка — `FrameBindBar`
 *
 * | состояние | вид | провенанс |
 * |---|---|---|
 * | `free` | `--muted`, пунктир сверху `--border-soft`, текст `--foreground-secondary`, глиф `info` | `.lb-bind.off` белый 7%, пунктир, `#93A7BF`; §11.2 «серая» |
 * | `assigned` | `--success-surface`, текст `--success-strong`, галочка; шаг bold · объект | `.lb-bind.on` `#1E6E43`, белый, шаг 700, объект `#BFEBD2`; §11.2 «зелёная» |
 * | `locked` | как `assigned`, замок вместо галочки, причина «— изменить нельзя» | `.lb-bind.on` + `SVG_LOCK`; §11.2 «зелёная с замком» |
 * | подбор (`suggestion`) | вид `free`, глиф `auto-fix` | `lbSuggest`: плашка остаётся `.off`; §11.2 «подбор выполнен» |
 * | вспышка (`flash`) | кольцо 2px `--success`, пилюля «Распределено» `success` на `--card`, кнопки выключены | `.lb-bind.flash` `#2E9E5B` + кольцо 2px 50%, «РАСПРЕДЕЛЕНО» 12/800 на белом 22%, `.act` 0.35; §11.3 |
 *
 * Роли — такта 30: фон `*-surface`, текст `*-strong`. Белый текст на `--success` — 2.7:1,
 * поэтому фон вспышки не меняется, вспышку несут кольцо и пилюля. Пилюля — правило такта 33:
 * на подложке своего тона стоит на `--card`. Прописных в ките нет — «Распределено» строчными.
 *
 * Кнопки плашки — `Button secondary sm` (прецедент полосы приёмки, такт 31). **Глифов на них
 * нет**: у малой кнопки мастера слота иконки нет (`57:340`), лупа и палочка прототипа
 * (`.act` 12.5, h 30) не переносятся. «Enter» в «Принять» — `Kbd` (такт 35; до него — та же
 * геометрия номера клавиши `stepKeyClass`) на `--card`: на `--secondary` кнопки подложка
 * `--tag` = `--secondary` сливается — тот же случай, что правило пилюли.
 *
 * «или нажмите 1–N» — только при текущем объекте (`keys`), решение владельца 3, такт 34:
 * опора — спека §16.2; расхождение с буквой §11.2 — `figma-fixes.md`.
 *
 * ## Кадр — `FrameStage`
 *
 * | часть | кит | прототип |
 * |---|---|---|
 * | кадр | ширина по изображению, радиус 8 (`rounded-md`), подложка `--muted`, `object-contain` | `.lb-main img` радиус 8 сверху, `#22303F` |
 * | кольцо привязанного | 2px `--success` вокруг кадра с плашкой | `.lb-stage.on` 3px `#2E9E5B` |
 * | тень | нет | 0/20/60 50% — на светлой поверхности композиции `8867:69956` кадр без тени |
 *
 * ## Метаданные — `FrameMeta`, метка — `FrameStatus`
 *
 * `FrameMeta`: сетка «подпись — значение», `text-xs`, подпись `--foreground-secondary`, значение
 * medium `--foreground`, паддинг 12/16, зазор 4/12, линия снизу `--border-soft` (прототип
 * `.lb-meta` 12.5, `#55677A`, значение 600, паддинг 11/16, зазор 5/12). `FrameStatus` — пилюля
 * `stepCounterVariants`: «распределён» `success` с галочкой, «не распределён» `neutral`
 * (прототип `.lbchip`; в §11.1 метки нет — расширение прототипа, переносится).
 */
export type FrameBindState = 'free' | 'assigned' | 'locked'

export type FrameSuggestion =
  | { kind: 'step', stepName: string, ownerName: string, blocked?: 'frozen' | 'full' }
  | { kind: 'create', title: string, inv?: string, stageTitle: string }
