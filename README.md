# Now Assistant

A server for deploying and aliasing [Zeit Now](https://now.sh) projects.

The server exposes a single resource at `/deploy`. When a `GET` request is made
to this, Now Assistant will:

- Clone your git repository.
- Sync files to Now.
- Create a new Now deployment.
- Alias the new deployment (once it has initialised).

Zeit are adding a feature like this to Now soon.

## 🚨 Jank alert

A lot of this is quite poorly written. I pieced it together from the Now
API docs and the Now CLI source code quickly so that I can deploy my Gatsby
static site. Still, you might find it useful 🤷‍.

There are lots of errors I'm not handling properly. Seeing as each deployment
involves multiple calls to the Now API, I really should add some sturdier error
handling.

## Setup

[![Deploy to now](https://deploy.now.sh/static/button.svg)](https://deploy.now.sh/?repo=https://github.com/juice49/now-assistant&env=NOW_TOKEN&env=GIT_REMOTE&env=ALIAS)

I use Now to host the Assistant. Currently, the Assistant does *not* read
config from your project's `now.json` or `package.json`. Instead, set the following
environment variables when you deploy the Assistant:

| Variable | Description | Required | Options |
|---|---|---|---|
| NOW_TOKEN | Now access token. | Required | |
| GIT_REMOTE | The remote of the git repository to deploy. | Required | |
| DEPLOYMENT_TYPE | Now deployment type. | Required | `NPM`, `DOCKER`, or `STATIC` |
| ALIAS | The alias to set once the deployment is ready. | Optional | |

There are lots of options missing currently. When deploying using the Now CLI,
it handles much of the config—and I've not included this in the Assistant.

Once the server is running, make a `GET` request to `/deploy` to kick off the
process.

## Next

- Webhook verification.
- The ability to add routes.
- Better config handling.
- Send an email when deployments or errors occur.
