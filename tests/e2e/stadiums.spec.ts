import { test, expect } from '@playwright/test'

test.describe('Stadium Selection and Environment Switching Flow', () => {
  test('navigates to stadium selection, verifies cards, and selects each environment', async ({ page }) => {
    // 1. Visit Stadium Selection screen directly or via flow
    await page.goto('/stadium-selection')
    await expect(page.locator('h1:has-text("Select Stadium")')).toBeVisible()

    // 2. Verify all three stadiums exist and are displayed
    await expect(page.locator('h3:has-text("Neon Metropolis")')).toBeVisible()
    await expect(page.locator('h3:has-text("Tropical Beach Arena")')).toBeVisible()
    await expect(page.locator('h3:has-text("Mountain Valley Arena")')).toBeVisible()

    // 3. Test selecting Tropical Beach Arena
    await page.click('h3:has-text("Tropical Beach Arena")')
    await expect(page.locator('text=Selected Venue: Tropical Beach Arena')).toBeVisible()

    // 4. Test selecting Mountain Valley Arena
    await page.click('h3:has-text("Mountain Valley Arena")')
    await expect(page.locator('text=Selected Venue: Mountain Valley Arena')).toBeVisible()

    // 5. Test selecting Neon Metropolis
    await page.click('h3:has-text("Neon Metropolis")')
    await expect(page.locator('text=Selected Venue: Neon Metropolis')).toBeVisible()

    // 6. Test Back button to team selection
    await page.click('button[title="Back to Team Selection"]')
    await expect(page).toHaveURL(/.*team-selection/)

    // Return to stadium selection
    await page.click('text=Select Stadium')
    await expect(page).toHaveURL(/.*stadium-selection/)

    // 7. Start match and verify 3D scene mounts
    await page.click('button:has-text("Start Match")')
    await expect(page).toHaveURL(/.*match/)
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})
