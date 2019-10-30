/**
 * @jest-environment node
 */

import { TestResourceManager } from './util/TestResourceManager'
import { GraphQLClient } from './util/GraphQLClient'
import { Driver } from '../../../shared/src/e2e/driver'
import { getTestTools } from './util/init'
import { getConfig } from '../../../shared/src/e2e/config'
import { ensureLoggedInOrCreateTestUser } from './util/helpers'
import { ScreenshotVerifier } from './util/ScreenshotVerifier'
import * as GQL from '../../../shared/src/graphql/schema'
import { ensureTestExternalService } from './util/api'

describe('Code navigation regression test suite', () => {
    const testUsername = 'test-codenav'
    const config = getConfig(
        'sudoToken',
        'sudoUsername',
        'gitHubToken',
        'sourcegraphBaseUrl',
        'noCleanup',
        'testUserPassword',
        'logBrowserConsole',
        'slowMo',
        'headless',
        'keepBrowser',
        'logStatusMessages'
    )
    const testExternalServiceInfo = {
        kind: GQL.ExternalServiceKind.GITHUB,
        uniqueDisplayName: '[TEST] GitHub (codenav.test.ts)',
    }
    const testRepoSlugs = [
        'sourcegraph/sourcegraph', // Go and TypeScript
        'sourcegraph/javascript-typescript-langserver', // TypeScript
        'sourcegraph/appdash', // Python
    ]

    let driver: Driver
    let gqlClient: GraphQLClient
    let resourceManager: TestResourceManager
    let screenshots: ScreenshotVerifier
    beforeAll(async () => {
        ;({ driver, gqlClient, resourceManager } = await getTestTools(config))
        resourceManager.add(
            'User',
            testUsername,
            await ensureLoggedInOrCreateTestUser(driver, gqlClient, {
                username: testUsername,
                deleteIfExists: true,
                ...config,
            })
        )
        resourceManager.add(
            'External service',
            testExternalServiceInfo.uniqueDisplayName,
            await ensureTestExternalService(
                gqlClient,
                {
                    ...testExternalServiceInfo,
                    config: {
                        url: 'https://github.com',
                        token: config.gitHubToken,
                        repos: testRepoSlugs,
                        repositoryQuery: ['none'],
                    },
                    waitForRepos: testRepoSlugs.map(slug => 'github.com/' + slug),
                },
                config
            )
        )
        screenshots = new ScreenshotVerifier(driver)
    })
    afterAll(async () => {
        if (!config.noCleanup) {
            await resourceManager.destroyAll()
        }
        if (driver) {
            await driver.close()
        }
        if (screenshots.screenshots.length > 0) {
            console.log(screenshots.verificationInstructions())
        }
    })

    test('Scroll to proper line', async () => {
        // TODO
    })

    test('References panel', async () => {
        // TODO
    })

    test('Basic code intel: TypeScript', async () => {
        // TODO
        const testCases = [
            {
                repoRev: 'github.com/sourcegraph/sourcegraph@7d557b9cbcaa5d4f612016bddd2f4ef0a7efed25',
                files: [
                    {
                        path: 'cmd/frontend/backend/repos.go',
                        locations: [
                            {
                                line: 46,
                                token: 'Get',
                                expectedHoverContains:
                                    'func (s *repos) Get(ctx context.Context, repo api.RepoID) (_ *types.Repo, err error)',
                                expectedDefinitions: [
                                    '/github.com/sourcegraph/sourcegraph@7d557b9cbcaa5d4f612016bddd2f4ef0a7efed25/-/blob/cmd/frontend/backend/repos.go#L46:17',
                                ],
                                expectedReferences: [
                                    '/github.com/sourcegraph/sourcegraph@7d557b9cbcaa5d4f612016bddd2f4ef0a7efed25/-/blob/cmd/frontend/backend/repos.go#L46:17',
                                ],
                                expectedXReferences: ['sourcegraph/appdash'],
                            },
                        ],
                    },
                ],
            },
        ]
        // testCases.forEach( ({ repo, files }))
        for (const { repoRev, files } of testCases) {
            for (const { path, locations } of files) {
                for (const {
                    line,
                    token,
                    expectedHoverContains,
                    expectedDefinitions,
                    expectedReferences,
                    expectedXReferences,
                } of locations) {
                    await driver.page.goto(config.sourcegraphBaseUrl + `/${repoRev}/-/blob/${path}`)
                    await driver.page.waitForSelector('.e2e-blob')
                    const tokenEl = await driver.page.$x(
                        `//*[contains(@class, "e2e-blob")]//tr[${line}]//*[text() = ${JSON.stringify(token)}]`
                    )
                    if (tokenEl.length === 0) {
                        throw new Error(`did not find token ${JSON.stringify(token)} on page`)
                    }
                    await tokenEl[0].hover()
                    await driver.page.waitForSelector('.e2e-tooltip-go-to-definition')
                    await driver.page.waitForSelector('.e2e-tooltip-content')
                    // await driver.findElementWithText(expectedHoverContains)
                    const tooltip = await driver.page.evaluate(
                        () => (document.querySelector('.e2e-tooltip-content') as HTMLElement).innerText
                    )
                    expect(tooltip).toContain(expectedHoverContains)
                    // >>>> definitions, refs, xrefs
                }
            }
        }
    })

    // TODO:
    // - Basic code intel
    //   - JavaScript
    //   - Typescript
    //   - Go
    //   - Python
    //   - Java
})
