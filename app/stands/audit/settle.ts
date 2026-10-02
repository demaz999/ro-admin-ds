/**
 * Правило снимка для автопроверок `/compare` — такт 61 (`docs/scheme-edit.md`, раздел 10, решение чата 2026-10-02).
 * Оснастка приёмки, не продукт.
 *
 * Автопроверки считали узлы на первом таймере после монтирования. На холодном старте dev-сервера счёт шрифтовой
 * проверки разошёлся с обычным (1060 против 1057): обход застал страницу до конца первой отрисовки. Перед обходом
 * документ доводится до покоя тем же правилом, что и снимок для побайтной сверки (`CLAUDE.md`):
 *
 * 1. шрифты загружены — `document.fonts.ready`;
 * 2. картинки загружены и декодированы; ожидание каждой ограничено 3 с — ленивая картинка за экраном не грузится;
 * 3. отложенный старт — пауза таймером, чтобы порталы и `Presence` Reka успели отрисоваться; именно таймер:
 *    `requestAnimationFrame` молчит во вкладке, которую браузер не рисует.
 */
export async function settle(doc: Document = document, pause = 300): Promise<void> {
  const win = doc.defaultView ?? window
  const wait = (ms: number) => new Promise<void>(r => win.setTimeout(r, ms))
  await doc.fonts.ready
  await Promise.all(Array.from(doc.images).map(img => Promise.race([
    (img.complete
      ? Promise.resolve()
      : new Promise<void>((r) => {
          img.addEventListener('load', () => r(), { once: true })
          img.addEventListener('error', () => r(), { once: true })
        })
    ).then(() => img.decode?.().catch(() => {})),
    wait(3000),
  ])))
  await wait(pause)
  await doc.fonts.ready
  await wait(0)
}
