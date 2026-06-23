import { test, expect } from '@playwright/test';

test.describe('Slice 0 Checkpoint - App Shell & Seeded Data', () => {
  test('app shell loads with navigation', async ({ page }) => {
    await page.goto('/');

    // NavBar renders with expected links
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();

    await expect(page.getByRole('link', { name: 'New Request' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();

    // App title renders
    await expect(page.getByText('Squad Assembly')).toBeVisible();
  });

  test('WorkRequestPage renders seeded skills from the API', async ({ page }) => {
    await page.goto('/');

    // Wait for skills group to render
    const skillsGroup = page.getByRole('group', { name: 'Available skills' });
    await expect(skillsGroup).toBeVisible({ timeout: 10000 });

    // Verify known skills from seed data are present
    await expect(skillsGroup.getByText('TypeScript')).toBeVisible();
    await expect(skillsGroup.getByText('React')).toBeVisible();
    await expect(skillsGroup.getByText('Python')).toBeVisible();
    await expect(skillsGroup.getByText('Docker')).toBeVisible();
    await expect(skillsGroup.getByText('Machine Learning')).toBeVisible();

    // Verify the count shows 20 skills (checkboxes)
    const skillCheckboxes = skillsGroup.getByRole('checkbox');
    await expect(skillCheckboxes).toHaveCount(20);
  });

  test('WorkRequestPage renders seeded roles from the API', async ({ page }) => {
    await page.goto('/');

    // Wait for roles group to render
    const rolesGroup = page.getByRole('group', { name: 'Available roles' });
    await expect(rolesGroup).toBeVisible({ timeout: 10000 });

    // Check known roles from seed data
    await expect(rolesGroup.getByText('Architect')).toBeVisible();
    await expect(rolesGroup.getByText('Engineer', { exact: true })).toBeVisible();
    await expect(rolesGroup.getByText('Tester')).toBeVisible();
    await expect(rolesGroup.getByText('Delivery Manager')).toBeVisible();
    await expect(rolesGroup.getByText('Data Specialist')).toBeVisible();
    await expect(rolesGroup.getByText('DevOps Engineer')).toBeVisible();

    // Verify the count shows 6 roles (checkboxes)
    const roleCheckboxes = rolesGroup.getByRole('checkbox');
    await expect(roleCheckboxes).toHaveCount(6);
  });

  test('navigation to history page works', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');
  });
});
