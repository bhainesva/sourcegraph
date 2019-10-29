import * as GQL from '../../../../shared/src/graphql/schema'
import * as React from 'react'
import { eventLogger } from '../../tracking/eventLogger'
import { PageTitle } from '../../components/PageTitle'
import { RouteComponentProps } from 'react-router'
import { fetchLsifDumps } from './backend'
import { FilteredConnection, FilteredConnectionQueryArgs } from '../../components/FilteredConnection'
import { Timestamp } from '../../components/time/Timestamp'
import { LinkOrSpan } from '../../../../shared/src/components/LinkOrSpan'

interface LsifDumpNodeProps {
    node: GQL.ILSIFDump
}

interface LsifDumpNodeState {}

class LsifDumpNode extends React.PureComponent<LsifDumpNodeProps, LsifDumpNodeState> {
    public state: LsifDumpNodeState = {}

    public render(): JSX.Element | null {
        return (
            <tr>
                <td>
                    <code>
                        {/* TODO: Is this link construction ok? */}
                        <LinkOrSpan to={`../commit/${this.props.node.commit}`}>
                            {this.props.node.commit.substr(0, 7)}
                        </LinkOrSpan>
                    </code>
                </td>
                <td>{this.props.node.root}</td>
                <td>{this.props.node.visibleAtTip}</td>
                <td>
                    <Timestamp date={this.props.node.uploadedAt} />
                </td>
            </tr>
        )
    }
}

class FilteredLsifDumpsConnection extends FilteredConnection<{}, LsifDumpNodeProps> {}

export const FilteredLsifDumpsHeader: React.FunctionComponent<{ nodes: any }> = () => (
    <thead>
        <tr>
            <th>Commit</th>
            <th>Root</th>
            <th>Visible At Tip</th>
            <th>Uploaded At</th>
        </tr>
    </thead>
)

interface Props extends RouteComponentProps<any> {
    repo: GQL.IRepository
}

interface State {}

/**
 * The repository settings LSIF page.
 */
export class RepoSettingsLsifPage extends React.PureComponent<Props, State> {
    public state: State = {}

    public componentDidMount(): void {
        eventLogger.logViewEvent('RepoSettingsLsif')
    }

    public render(): JSX.Element | null {
        return (
            <div className="repo-settings-lsif-page">
                <PageTitle title="LSIF" />
                <h2>LSIF</h2>
                <FilteredLsifDumpsConnection
                    className="list-group list-group-flush mt-3"
                    noun="dump"
                    pluralNoun="dumps"
                    queryConnection={this.queryDumps}
                    nodeComponent={LsifDumpNode}
                    history={this.props.history}
                    location={this.props.location}
                    appendResults={true}
                    listComponent="table"
                    headComponent={FilteredLsifDumpsHeader}
                />
            </div>
        )
    }

    private queryDumps = (args: FilteredConnectionQueryArgs) =>
        fetchLsifDumps({ repository: this.props.repo.name, ...args })
}
