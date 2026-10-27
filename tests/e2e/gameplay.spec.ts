import { test, expect } from '@playwright/test'

test.describe('FC27 Football Simulator E2E Flow', () => {
  test('navigates from main menu through team selection to live 3D match', async ({ page }) => {
    // 1. Visit Main Menu
    await page.goto('/')
    await expect(page.locator('text=FC 27')).toBeVisible()
    await expect(page.locator('text=Kick Off')).toBeVisible()

    // 2. Click Kick Off to go to Team Selection
    await page.click('text=Kick Off')
    await expect(page).toHaveURL(/.*team-selection/)
    await expect(page.locator('text=Select Teams')).toBeVisible()

    // 3. Click Start Match to enter 3D match
    await page.click('text=Start Match')
    await expect(page).toHaveURL(/.*match/)

    // 4. Verify 3D canvas and radar canvas are mounted and HUD is active
    const threeCanvas = page.locator('canvas').first()
    await expect(threeCanvas).toBeVisible()

    // Verify scoreboard and controls are present
    await expect(page.locator('text=PAUSE')).toBeVisible()
    await expect(page.locator('text=W A S D')).toBeVisible()

    // 5. Test Escape to open Pause Modal
    await page.keyboard.press('Escape')
    await expect(page.locator('text=Match Paused')).toBeVisible()
    await expect(page.locator('text=Resume Match')).toBeVisible()

    // 6. Resume Match
    await page.click('text=Resume Match')
    await expect(page.locator('text=Match Paused')).not.toBeVisible()

    // 7. Pause again and Quit to Main Menu
    await page.keyboard.press('Escape')
    await page.click('text=Quit to Menu')
    await expect(page).toHaveURL(/.*\//)
    await expect(page.locator('text=FC 27')).toBeVisible()
  })

  test('navigates to settings and remaps keys', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=Game Settings & Controls')).toBeVisible()
    await expect(page.locator('text=Dynamic Stadium Shadows')).toBeVisible()
  })

  test('navigates to tactics and inspects formations', async ({ page }) => {
    await page.goto('/tactics')
    await expect(page.locator('text=Formation Pitch Map')).toBeVisible()
    await expect(page.getByText('Team Mentality', { exact: true })).toBeVisible()
  })
})
