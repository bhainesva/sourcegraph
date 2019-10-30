#!/usr/bin/env bash

cd $(dirname "${BASH_SOURCE[0]}")/../..
set -euxo pipefail

BUILD_ARGS=(
    "DATE"
    "COMMIT_SHA"
    "VERSION"
    "MANAGEMENT_CONSOLE_PKG"
)

if [[ "$CI" == "true" ]]; then

    substitutions="_IMAGE=$IMAGE"
    for arg in "${BUILD_ARGS[@]}"; do
        if [[ "${!arg}" ]]; then
            substitutions+=",_${arg}=${!arg}"
        fi
    done

    gcloud builds submit --config=cmd/management-console/cloudbuild.yaml \
        --substitutions=$substitutions \
        --no-source
else

    build_arg_str=""
    for arg in "${BUILD_ARGS[@]}"; do
        if [[ "${!arg}" ]]; then
            build_arg_str+="--build-arg ${arg}=${!arg} "
        fi
    done

    docker build -f cmd/management-console/Dockerfile -t $IMAGE . \
        $build_arg_str \
        --progress=plain

fi

