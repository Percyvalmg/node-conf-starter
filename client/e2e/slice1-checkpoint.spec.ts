import { test, expect } from '@playwright/test';

test.describe('Slice 1 — Work Request Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the form to be fully loaded (skills and roles fetched from API)
    await expect(page.getByRole('form', { name: 'Create work request' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Available skills' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Available roles' })).toBeVisible();
  });

  test('fills out the form completely and submits → navigates to shortlist page', async ({
    page,
  }) => {
    // Fill title
    await page.getByLabel('Title').fill('Platform Migration Q1');

    // Fill description
    await page.getByLabel('Description').fill('Migrate legacy services to new platform');

    // Select skills — click the label text (checkboxes are sr-only)
    const skillsGroup = page.getByRole('group', { name: 'Available skills' });
    await skillsGroup.getByText('TypeScript', { exact: true }).click();
    await skillsGroup.getByText('React', { exact: true }).click();
    await skillsGroup.getByText('Node.js', { exact: true }).click();

    // Select roles
    const rolesGroup = page.getByRole('group', { name: 'Available roles' });
    await rolesGroup.getByText('Engineer', { exact: true }).click();
    await rolesGroup.getByText('Architect', { exact: true }).click();

    // Select urgency (click the label text, radio inputs are sr-only)
    await page.getByRole('radiogroup', { name: 'Urgency level' }).getByText('High').click();

    // Fill duration
    await page.getByLabel('Duration (weeks)').fill('12');

    // Submit
    await page.getByRole('button', { name: 'Submit Work Request' }).click();

    // Assert navigation to shortlist page
    await expect(page).toHaveURL(/\/work-requests\/[a-z0-9]+\/shortlist/, { timeout: 10000 });
    await expect(page.getByText('Candidate Shortlist')).toBeVisible();
  });

  test('submits an empty form → shows inline validation errors', async ({ page }) => {
    // Click submit without filling anything
    await page.getByRole('button', { name: 'Submit Work Request' }).click();

    // Assert inline validation errors appear for required fields
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Select at least 1 skill')).toBeVisible();
    await expect(page.getByText('Select at least 1 role')).toBeVisible();
    await expect(page.getByText('Select an urgency level')).toBeVisible();
    await expect(page.getByText('Duration is required')).toBeVisible();

    // Should still be on the same page
    await expect(page).toHaveURL('/');
  });

  test('filled fields retain their values after a validation error', async ({ page }) => {
    // Fill some fields but leave others empty to trigger partial validation errors
    const testTitle = 'Retention Test Request';
    const testDescription = 'Testing data retention on validation failure';

    await page.getByLabel('Title').fill(testTitle);
    await page.getByLabel('Description').fill(testDescription);

    // Select a skill and a role (clicking labels since checkboxes are sr-only)
    const skillsGroup = page.getByRole('group', { name: 'Available skills' });
    await skillsGroup.getByText('TypeScript', { exact: true }).click();

    const rolesGroup = page.getByRole('group', { name: 'Available roles' });
    await rolesGroup.getByText('Engineer', { exact: true }).click();

    // Leave urgency and duration empty to trigger validation

    // Submit to trigger validation errors
    await page.getByRole('button', { name: 'Submit Work Request' }).click();

    // Validation errors should appear for unfilled fields
    await expect(page.getByText('Select an urgency level')).toBeVisible();
    await expect(page.getByText('Duration is required')).toBeVisible();

    // Previously filled fields should retain their values
    await expect(page.getByLabel('Title')).toHaveValue(testTitle);
    await expect(page.getByLabel('Description')).toHaveValue(testDescription);

    // Skills and roles should still be selected (checkbox is checked)
    await expect(
      skillsGroup.getByRole('checkbox', { name: 'TypeScript', exact: true })
    ).toBeChecked();
    await expect(
      rolesGroup.getByRole('checkbox', { name: 'Engineer', exact: true })
    ).toBeChecked();
  });
});
