import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { gql, dataOrThrowErrors } from '../../../../shared/src/graphql/graphql'
import * as GQL from '../../../../shared/src/graphql/schema'
import { createAggregateError } from '../../../../shared/src/util/errors'
import { queryGraphQL } from '../../backend/graphql'

/**
 * Fetches a repository.
 */
export function fetchRepository(name: string): Observable<GQL.IRepository> {
    return queryGraphQL(
        gql`
            query Repository($name: String!) {
                repository(name: $name) {
                    id
                    name
                    viewerCanAdminister
                    mirrorInfo {
                        remoteURL
                        cloneInProgress
                        cloneProgress
                        cloned
                        updatedAt
                        updateSchedule {
                            due
                            index
                            total
                        }
                        updateQueue {
                            updating
                            index
                            total
                        }
                    }
                    externalServices {
                        nodes {
                            id
                            kind
                            displayName
                        }
                    }
                }
            }
        `,
        { name }
    ).pipe(
        map(({ data, errors }) => {
            if (!data || !data.repository) {
                throw createAggregateError(errors)
            }
            return data.repository
        })
    )
}

/**
 * Fetch LSIF dumps for a repository.
 */
export function fetchLsifDumps({
    repository,
    first,
    after,
    query,
}: {
    repository: string
    first?: number
    after?: string | null
    query?: string
}): Observable<GQL.ILSIFDumpConnection> {
    return queryGraphQL(
        gql`
            query LsifDumps($repository: String!, $first: Int, $after: ID, $query: String) {
                lsifDumps(repository: $repository, first: $first, after: $after, query: $query) {
                    nodes {
                        id
                        repository
                        commit
                        root
                        visibleAtTip
                        uploadedAt
                    }

                    totalCount
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        `,
        { repository, first, after, query }
    ).pipe(
        map(dataOrThrowErrors),
        map(data => data.lsifDumps)
    )
}
