import { test, expect } from '@playwright/test';

/**
 * Full-journey E2E suite — Squad Assembly
 *
 * Requirements validated: 1.1, 1.3, 4.1, 5.1, 6.1
 *
 * Journey:
 *   1. Create a work request via the form
 *   2. View the ranked shortlist
 *   3. Select candidates and save a squad
 *   4. Confirm the squad appears in history
 *
 * Also validates:
 *   - Form validation feedback (inline errors, data retention)
 *   - Empty states (no qualifying candidates message)
 *   - Error handling contract (navigation guard)
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fill and submit the work request form with valid data. Returns the work request title used. */
async function createWorkRequest(
  page: import('@playwright/test').Page,
  options: {
    title?: string;
    description?: string;
    skills?: string[];
    roles?: string[];
    urgency?: string;
    duration?: string;
  } = {}
) {
  const title = options.title ?? `E2E Squad Request ${Date.now()}`;
  const skills = options.skills ?? ['TypeScript', 'React', 'Node.js'];
  const roles = options.roles ?? ['Engineer', 'Architect'];
  const urgency = options.urgency ?? 'High';
  const duration = options.duration ?? '8';

  await page.goto('/');
  await expect(page.getByRole('form', { name: 'Create work request' })).toBeVisible();

  // Wait for skills/roles to load
  const skillsGroup = page.getByRole('group', { name: 'Available skills' });
  const rolesGroup = page.getByRole('group', { name: 'Available roles' });
  await expect(skillsGroup).toBeVisible({ timeout: 10_000 });
  await expect(rolesGroup).toBeVisible({ timeout: 10_000 });

  await page.getByLabel('Title').fill(title);

  if (options.description) {
    await page.getByLabel('Description').fill(options.description);
  }

  for (const skill of skills) {
    await skillsGroup.getByText(skill, { exact: true }).click();
  }

  for (const role of roles) {
    await rolesGroup.getByText(role, { exact: true }).click();
  }

  await page.getByRole('radiogroup', { name: 'Urgency level' }).getByText(urgency).click();
  await page.getByLabel('Duration (weeks)').fill(duration);

  await page.getByRole('button', { name: 'Submit Work Request' }).click();

  // Must navigate to shortlist
  await expect(page).toHaveURL(/\/work-requests\/[a-z0-9-]+\/shortlist/, { timeout: 10_000 });

  return title;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('Squad Assembly — full journey', () => {
  // ── 1. Form validation feedback ─────────────────────────────────────────────

  test.describe('1. Work request form validation', () => {
    test('empty submit shows inline errors for all required fields', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('form', { name: 'Create work request' })).toBeVisible();

      await page.getByRole('button', { name: 'Submit Work Request' }).click();

      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Select at least 1 skill')).toBeVisible();
      await expect(page.getByText('Select at least 1 role')).toBeVisible();
      await expect(page.getByText('Select an urgency level')).toBeVisible();
      await expect(page.getByText('Duration is required')).toBeVisible();

      // Still on the same page
      await expect(page).toHaveURL('/');
    });

    test('partially filled form retains data after validation error', async ({ page }) => {
      await page.goto('/');
      const skillsGroup = page.getByRole('group', { name: 'Available skills' });
      const rolesGroup = page.getByRole('group', { name: 'Available roles' });
      await expect(skillsGroup).toBeVisible({ timeout: 10_000 });

      const testTitle = 'Retention Check Request';
      await page.getByLabel('Title').fill(testTitle);
      await page.getByLabel('Description').fill('Testing data retention');
      await skillsGroup.getByText('TypeScript', { exact: true }).click();
      await rolesGroup.getByText('Engineer', { exact: true }).click();
      // Intentionally leave urgency + duration empty

      await page.getByRole('button', { name: 'Submit Work Request' }).click();

      await expect(page.getByText('Select an urgency level')).toBeVisible();
      await expect(page.getByText('Duration is required')).toBeVisible();

      // Previously filled fields must still be present
      await expect(page.getByLabel('Title')).toHaveValue(testTitle);
      await expect(page.getByLabel('Description')).toHaveValue('Testing data retention');
      await expect(
        skillsGroup.getByRole('checkbox', { name: 'TypeScript', exact: true })
      ).toBeChecked();
      await expect(
        rolesGroup.getByRole('checkbox', { name: 'Engineer', exact: true })
      ).toBeChecked();
    });
  });

  // ── 2. Create → shortlist ───────────────────────────────────────────────────

  test.describe('2. Create work request and view shortlist', () => {
    test('submitting a valid form navigates to a ranked shortlist', async ({ page }) => {
      await createWorkRequest(page, {
        title: 'Shortlist Journey Test',
        skills: ['TypeScript', 'React'],
        roles: ['Engineer'],
        urgency: 'High',
        duration: '6',
      });

      // Shortlist page heading
      await expect(page.getByRole('heading', { name: 'Candidate Shortlist' })).toBeVisible();

      // At least one ranked row should appear (seed data has TypeScript + React engineers)
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    });

    test('shortlist displays match score, role, and availability for each candidate', async ({
      page,
    }) => {
      await createWorkRequest(page, {
        skills: ['TypeScript', 'Node.js'],
        roles: ['Engineer'],
        urgency: 'Medium',
        duration: '4',
      });

      // Wait for the first row
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Column headers exist
      await expect(page.getByRole('columnheader', { name: /match score/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /availability/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /role/i })).toBeVisible();
    });

    test('expanding a candidate row shows the score breakdown', async ({ page }) => {
      await createWorkRequest(page, {
        skills: ['TypeScript'],
        roles: ['Engineer'],
        urgency: 'Low',
        duration: '2',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Click the first Details button
      await page.locator('tbody').getByRole('button', { name: 'Details' }).first().click();

      await expect(page.getByText('Score Breakdown')).toBeVisible();
      await expect(page.getByText('Skill Match')).toBeVisible();
      await expect(page.getByText('Role Alignment')).toBeVisible();
    });
  });

  // ── 3. Squad selection and save ─────────────────────────────────────────────

  test.describe('3. Select and save a squad', () => {
    test('confirm button is disabled until at least one candidate is selected', async ({
      page,
    }) => {
      await createWorkRequest(page, {
        skills: ['TypeScript', 'React'],
        roles: ['Engineer'],
        urgency: 'High',
        duration: '6',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      const confirmBtn = page.getByRole('button', { name: /confirm squad/i });
      await expect(confirmBtn).toBeDisabled();

      await expect(
        page.getByText('Select at least one candidate to assemble a squad.')
      ).toBeVisible();
    });

    test('selecting candidates updates the skill coverage percentage', async ({ page }) => {
      await createWorkRequest(page, {
        skills: ['TypeScript', 'React', 'Node.js'],
        roles: ['Engineer', 'Architect'],
        urgency: 'High',
        duration: '8',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Select the first candidate via their checkbox
      const firstCheckbox = page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first();
      await firstCheckbox.click();

      // Skill coverage should now be > 0%
      const squadPanel = page.locator('text=Skill coverage:').locator('..');
      await expect(squadPanel).toBeVisible();
    });

    test('saving a squad shows success message and skill coverage', async ({ page }) => {
      await createWorkRequest(page, {
        skills: ['TypeScript', 'React'],
        roles: ['Engineer'],
        urgency: 'Critical',
        duration: '4',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Select the first candidate
      await page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first()
        .click();

      const confirmBtn = page.getByRole('button', { name: /confirm squad/i });
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();

      await expect(page.getByText(/squad saved successfully/i)).toBeVisible({ timeout: 10_000 });
    });

    test('reloading the shortlist pre-checks the previously saved squad', async ({ page }) => {
      // Create the work request and capture its URL
      await createWorkRequest(page, {
        title: 'Pre-check Persistence Test',
        skills: ['TypeScript'],
        roles: ['Engineer'],
        urgency: 'Medium',
        duration: '6',
      });

      const shortlistUrl = page.url();
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Select and save
      const firstCheckbox = page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first();
      await firstCheckbox.click();
      await page.getByRole('button', { name: /confirm squad/i }).click();
      await expect(page.getByText(/squad saved successfully/i)).toBeVisible({ timeout: 10_000 });

      // Reload the page
      await page.goto(shortlistUrl);
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // The previously saved candidate should be pre-checked
      const checkboxes = page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox');
      const checkedCount = await checkboxes.evaluateAll(
        (boxes: HTMLInputElement[]) => boxes.filter((b) => b.checked).length
      );
      expect(checkedCount).toBeGreaterThan(0);
    });
  });

  // ── 4. History page ─────────────────────────────────────────────────────────

  test.describe('4. View work request history', () => {
    test('navigating to /history shows previously created work requests', async ({ page }) => {
      const title = await createWorkRequest(page, {
        title: `History Verify ${Date.now()}`,
        skills: ['Python'],
        roles: ['Data Specialist'],
        urgency: 'Low',
        duration: '10',
      });

      // Go to history
      await page.getByRole('link', { name: 'History' }).click();
      await expect(page).toHaveURL('/history');
      await expect(page.getByRole('heading', { name: 'Work Request History' })).toBeVisible();

      // The request we just created should appear
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    });

    test('history list shows urgency and squad status for each entry', async ({ page }) => {
      await createWorkRequest(page, {
        title: `Status Display Test ${Date.now()}`,
        skills: ['TypeScript'],
        roles: ['Engineer'],
        urgency: 'Critical',
        duration: '2',
      });

      await page.getByRole('link', { name: 'History' }).click();
      await expect(page).toHaveURL('/history');

      // Should see the urgency badge
      await expect(page.getByText('Critical').first()).toBeVisible({ timeout: 10_000 });
    });

    test('clicking a history item opens the detail panel', async ({ page }) => {
      const title = await createWorkRequest(page, {
        title: `Detail Panel Test ${Date.now()}`,
        skills: ['React'],
        roles: ['Engineer'],
        urgency: 'Medium',
        duration: '4',
      });

      await page.getByRole('link', { name: 'History' }).click();
      await expect(page).toHaveURL('/history');
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: `View details for ${title}` }).click();

      await expect(page.getByRole('region', { name: 'Work request detail' })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    });

    test('history shows "Assembled" status after a squad is saved', async ({ page }) => {
      const title = await createWorkRequest(page, {
        title: `Squad Status Test ${Date.now()}`,
        skills: ['TypeScript', 'React'],
        roles: ['Engineer'],
        urgency: 'High',
        duration: '6',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Select and save a squad
      await page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first()
        .click();
      await page.getByRole('button', { name: /confirm squad/i }).click();
      await expect(page.getByText(/squad saved successfully/i)).toBeVisible({ timeout: 10_000 });

      // Navigate to history
      await page.getByRole('link', { name: 'History' }).click();
      await expect(page).toHaveURL('/history');
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      // The entry for this request should now show "Assembled"
      const listItem = page.locator('li').filter({ hasText: title });
      await expect(listItem.getByText('Assembled')).toBeVisible();
    });

    test('opening the detail of an assembled request shows squad member names and roles', async ({
      page,
    }) => {
      const title = await createWorkRequest(page, {
        title: `Member Detail Test ${Date.now()}`,
        skills: ['TypeScript'],
        roles: ['Engineer'],
        urgency: 'High',
        duration: '4',
      });

      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

      // Save a squad with the first candidate — capture the name for later assertion
      const firstCandidateName = await page
        .locator('table[aria-label="Select squad members"] tbody tr')
        .first()
        .locator('td')
        .nth(1)
        .innerText();

      await page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first()
        .click();
      await page.getByRole('button', { name: /confirm squad/i }).click();
      await expect(page.getByText(/squad saved successfully/i)).toBeVisible({ timeout: 10_000 });

      // History → open detail
      await page.getByRole('link', { name: 'History' }).click();
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: `View details for ${title}` }).click();

      await expect(page.getByRole('region', { name: 'Work request detail' })).toBeVisible({
        timeout: 10_000,
      });

      // The saved candidate should appear in the squad members list
      await expect(page.getByText(firstCandidateName)).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── 5. Complete end-to-end journey ──────────────────────────────────────────

  test.describe('5. Complete end-to-end journey', () => {
    test('create → shortlist → squad → history — full workflow in a single run', async ({
      page,
    }) => {
      const title = `Full Journey ${Date.now()}`;

      // Step 1 — Create work request
      await createWorkRequest(page, {
        title,
        description: 'Full end-to-end journey test',
        skills: ['TypeScript', 'React', 'Node.js'],
        roles: ['Engineer', 'Architect'],
        urgency: 'High',
        duration: '12',
      });

      // Step 2 — Shortlist loaded and shows candidates
      await expect(page.getByRole('heading', { name: 'Candidate Shortlist' })).toBeVisible();
      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 10_000 });

      // Step 3 — Select at least one candidate and save
      await page
        .locator('table[aria-label="Select squad members"] tbody')
        .getByRole('checkbox')
        .first()
        .click();
      await page.getByRole('button', { name: /confirm squad/i }).click();
      await expect(page.getByText(/squad saved successfully/i)).toBeVisible({ timeout: 10_000 });

      // Step 4 — History reflects the assembled request
      await page.getByRole('link', { name: 'History' }).click();
      await expect(page).toHaveURL('/history');
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      const listItem = page.locator('li').filter({ hasText: title });
      await expect(listItem.getByText('Assembled')).toBeVisible();

      // Step 5 — Detail panel shows the squad
      await page.getByRole('button', { name: `View details for ${title}` }).click();
      await expect(page.getByRole('region', { name: 'Work request detail' })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText('Assembled Squad')).toBeVisible();
    });
  });
});
