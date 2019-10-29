package graphqlbackend

import (
"strings"
	"context"
	"fmt"
	"net/url"
	"sync"

	graphql "github.com/graph-gophers/graphql-go"
	"github.com/graph-gophers/graphql-go/relay"
	"github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend/graphqlutil"
	"github.com/sourcegraph/sourcegraph/cmd/frontend/internal/lsif"
	"github.com/sourcegraph/sourcegraph/cmd/frontend/types"
)

type LSIFJobsListOptions struct {
	Status  string
	Query   *string
	Limit   *int32
	NextURL *string
}

// This method implements cursor-based forward pagination. The `after` parameter
// should be an `endCursor` value from a previous request. This value is the rel="next"
// URL in the Link header of the LSIF server response. This URL includes all of the
// query variables required to fetch the subsequent page of results. This state is not
// dependent on the limit, so we can overwrite this value if the user has changed its
// value since making the last request.

func (r *schemaResolver) LSIFJobs(args *struct {
	graphqlutil.ConnectionArgs
	Status string
	Query  *string
	After  *graphql.ID
}) (*lsifJobConnectionResolver, error) {
	opt := LSIFJobsListOptions{
		Status: args.Status,
		Query:  args.Query,
	}
	if args.First != nil {
		opt.Limit = args.First
	}
	if args.After != nil {
		nextURL, err := unmarshalLSIFJobsCursorGQLID(*args.After)
		if err != nil {
			return nil, err
		}
		opt.NextURL = &nextURL
	}

	return &lsifJobConnectionResolver{opt: opt}, nil
}

type lsifJobConnectionResolver struct {
	opt LSIFJobsListOptions

	// cache results because they are used by multiple fields
	once       sync.Once
	jobs       []*types.LSIFJob
	totalCount int
	nextURL    string
	err        error
}

func (r *lsifJobConnectionResolver) compute(ctx context.Context) ([]*types.LSIFJob, int, string, error) {
	r.once.Do(func() {
		var path string
		if r.opt.NextURL == nil {
			// first page of results
			path = fmt.Sprintf("/jobs/%s",strings.ToLower( r.opt.Status))
		} else {
			// subsequent page of results
			path = *r.opt.NextURL
		}

		fmt.Printf("> %#v\n", path)

		query := url.Values{}
		if r.opt.Query != nil {
			query.Set("query", *r.opt.Query)
		}
		if r.opt.Limit != nil {
			query.Set("limit", fmt.Sprintf("%d", *r.opt.Limit))
		}

		resp, err := lsif.BuildAndTraceRequest(ctx, path, query)
		if err != nil {
			r.err = err
			return
		}

		payload := struct {
			Jobs       []*types.LSIFJob `json:"jobs"`
			TotalCount int              `json:"totalCount"`
		}{
			Jobs: []*types.LSIFJob{},
		}

		if err := lsif.UnmarshalPayload(resp, &payload); err != nil {
			r.err = err
			return
		}

		r.jobs = payload.Jobs
		r.totalCount = payload.TotalCount
		r.nextURL = lsif.ExtractNextURL(resp)
	})

	return r.jobs, r.totalCount, r.nextURL, r.err
}

func (r *lsifJobConnectionResolver) Nodes(ctx context.Context) ([]*lsifJobResolver, error) {
	jobs, _, _, err := r.compute(ctx)
	if err != nil {
		return nil, err
	}

	var l []*lsifJobResolver
	for _, lsifJob := range jobs {
		l = append(l, &lsifJobResolver{
			lsifJob: lsifJob,
		})
	}
	return l, nil
}

func (r *lsifJobConnectionResolver) TotalCount(ctx context.Context) (int32, error) {
	_, count, _, err := r.compute(ctx)
	return int32(count), err
}

func (r *lsifJobConnectionResolver) PageInfo(ctx context.Context) (*graphqlutil.PageInfo, error) {
	_, _, nextURL, err := r.compute(ctx)
	if err != nil {
		return nil, err
	}

	if nextURL != "" {
		return graphqlutil.NextPageCursor(marshalLSIFJobsCursorGQLID(nextURL)), nil
	}

	return graphqlutil.HasNextPage(false), nil
}

func marshalLSIFJobsCursorGQLID(nextURL string) graphql.ID {
	return relay.MarshalID("LSIFJobsCursor", nextURL)
}

func unmarshalLSIFJobsCursorGQLID(id graphql.ID) (nextURL string, err error) {
	err = relay.UnmarshalSpec(id, &nextURL)
	return
}
