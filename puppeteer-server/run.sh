#!/bin/bash

# This script runs the puppeteer server base container, using volume maps instead of copying files into the container

set -e
set -x



docker run --rm --cap-add=SYS_ADMIN \
  --env ZX_AUTO_RESTART=true \
  --env ZX_NODE_INSPECT=--inspect=0.0.0.0 \
  --env ZX_MODE=worker \
  --env "ZX_NODE_ARGS=./runtime/puppeteer-server/index.js start-worker --port=10000" \
  -p 9000:9000 \
  -p 9329:9229 \
  -v "$(cd .. ; pwd)/puppeteer-server/release/container/app:/home/pptruser/app" \
  -v "$(cd .. ; pwd)/puppeteer-server/release/container/bin:/home/pptruser/bin" \
  -v "$(cd .. ; pwd)/compiled/source-node:/home/pptruser/app/runtime" \
  -it \
  $@ \
  zenesisuk/zx-puppeteer-server bash
  #/home/pptruser/bin/start.sh

