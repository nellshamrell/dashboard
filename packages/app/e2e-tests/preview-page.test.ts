import { test, expect } from '@playwright/test';

const sampleGraph = {
  resources: [
    {
      id: '/planes/radius/local/resourceGroups/default/providers/Applications.Core/containers/webapp',
      type: 'Applications.Core/containers',
      name: 'webapp',
      provisioningState: 'NotDeployed',
      outputResources: [],
      connections: [
        {
          id: '/planes/radius/local/resourceGroups/default/providers/Applications.Datastores/redisCaches/cache',
          direction: 'Outbound',
        },
      ],
    },
    {
      id: '/planes/radius/local/resourceGroups/default/providers/Applications.Datastores/redisCaches/cache',
      type: 'Applications.Datastores/redisCaches',
      name: 'cache',
      provisioningState: 'NotDeployed',
      outputResources: [],
      connections: [],
    },
  ],
};

test.describe('Preview Page', () => {
  test('should navigate to /preview and render the import panel', async ({
    page,
  }) => {
    await page.goto('/preview');

    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await expect(page.getByLabelText('JSON input')).toBeVisible();
    await expect(page.getByText('Import')).toBeVisible();
  });

  test('should render graph after pasting valid JSON', async ({ page }) => {
    await page.goto('/preview');

    const textArea = page.getByLabel('JSON input');
    await textArea.fill(JSON.stringify(sampleGraph));
    await page.getByText('Import').click();

    // Verify preview banner appears
    await expect(page.getByTestId('preview-banner')).toBeVisible();
    await expect(
      page.getByText('This graph was imported from a file'),
    ).toBeVisible();

    // Verify graph renders (React Flow attribution link is present)
    await expect(
      page.getByRole('link', { name: 'React Flow attribution' }),
    ).toBeVisible();
  });

  test('should show share button and copy URL', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/preview');

    const textArea = page.getByLabel('JSON input');
    await textArea.fill(JSON.stringify(sampleGraph));
    await page.getByText('Import').click();

    // Wait for graph and share button
    await expect(page.getByTestId('share-button')).toBeVisible();
    await page.getByTestId('share-button').click();

    // Verify button text changes to "Link Copied!"
    await expect(page.getByTestId('share-button')).toHaveText('Link Copied!');

    // Verify URL hash was updated
    const url = page.url();
    expect(url).toContain('#graph=');
  });

  test('should render graph from shared URL hash', async ({ page }) => {
    await page.goto('/preview');

    // First, import a graph to generate the hash
    const textArea = page.getByLabel('JSON input');
    await textArea.fill(JSON.stringify(sampleGraph));
    await page.getByText('Import').click();

    await expect(page.getByTestId('share-button')).toBeVisible();
    await page.getByTestId('share-button').click();

    // Get the current URL with hash
    const sharedUrl = page.url();
    expect(sharedUrl).toContain('#graph=');

    // Navigate to the shared URL in a fresh page load
    await page.goto(sharedUrl);

    // Verify graph renders from the hash
    await expect(page.getByTestId('preview-banner')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'React Flow attribution' }),
    ).toBeVisible();
  });

  test('should show error for corrupted shared URL', async ({ page }) => {
    await page.goto('/preview#graph=!!!corrupted!!!');

    await expect(page.getByTestId('hash-error')).toBeVisible();
  });

  test('should show validation errors for invalid JSON', async ({ page }) => {
    await page.goto('/preview');

    const textArea = page.getByLabel('JSON input');
    await textArea.fill('{bad json');
    await page.getByText('Import').click();

    await expect(page.getByText(/Invalid JSON/)).toBeVisible();
  });
});
