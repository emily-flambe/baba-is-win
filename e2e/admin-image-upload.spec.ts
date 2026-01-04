import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Admin Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin and login
    await page.goto('/admin');

    // Wait for login form
    await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

    // Fill login form
    await page.fill('#email', 'emily');
    await page.fill('#password', 'hunter2');
    await page.click('button[type="submit"]');

    // Wait a moment for login to process
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/after-login.png' });

    // Wait for dashboard to load (look for Logout button which indicates success)
    await expect(page.locator('text=Logout')).toBeVisible({ timeout: 10000 });
  });

  test('upload image in ThoughtEditor', async ({ page }) => {
    // Switch to Thoughts tab first
    await page.click('button:has-text("Thoughts")');
    await page.waitForTimeout(500);

    // Click new thought button
    await page.click('button:has-text("New Thought")');

    // Wait for editor to load
    await expect(page.locator('text=New Thought')).toBeVisible();

    // Click upload image button and handle file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Upload Image")'),
    ]);

    // Upload the sample image
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample.png'));

    // Wait for upload to complete and verify preview appears
    await expect(page.locator('.image-preview')).toBeVisible({ timeout: 15000 });

    // Verify the image src contains the upload path
    const imageSrc = await page.locator('.image-preview').getAttribute('src');
    expect(imageSrc).toContain('/assets/uploads/');
  });

  test('upload thumbnail in PostEditor', async ({ page }) => {
    // Click new post button (Posts tab is default)
    await page.click('button:has-text("New Post")');

    // Wait for editor to load
    await expect(page.locator('h1:has-text("New Post")')).toBeVisible();

    // Click upload image button and handle file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Upload Image")'),
    ]);

    // Upload the sample image
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/sample.png'));

    // Wait for upload to complete and verify preview appears
    await expect(page.locator('.thumbnail-preview img')).toBeVisible({ timeout: 15000 });

    // Verify the thumbnail URL input is populated
    const thumbnailUrl = await page.locator('#thumbnail').inputValue();
    expect(thumbnailUrl).toContain('/assets/uploads/');
  });

  test('rejects invalid file type', async ({ page }) => {
    // Switch to Thoughts tab
    await page.click('button:has-text("Thoughts")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("New Thought")');
    await expect(page.locator('h1:has-text("New Thought")')).toBeVisible();

    // Create a fake text file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Upload Image")'),
    ]);

    // Try to upload a non-image file
    await fileChooser.setFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    // Should show error (client-side validation)
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
  });
});
