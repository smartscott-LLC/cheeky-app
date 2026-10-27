**Routing**  
**On this page**

\# Microfrontends Routing

Microfrontends routing determines which application handles a path and which deployment of that application receives the request. Vercel makes both routing decisions in its network infrastructure.

When Vercel receives a request to a domain that uses microfrontends, it reads the \`microfrontends.json\` file in the live deployment to determine which application handles the path. This happens within the same request. It is not a rewrite that results in a second outbound request to the child application's URL, so there is no additional network hop.

\!\[How Vercel's network infrastructure routes microfrontend paths.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/routing-diagram-light.png)\!\[How Vercel's network infrastructure routes microfrontend paths.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/routing-diagram-dark.png)

How Vercel's network infrastructure routes microfrontend paths.

You can also route paths to a different microfrontend based on custom application logic using middleware.

\#\# Configure path routing

To route paths to a new microfrontend, modify the \`microfrontends.json\` file in your default application. In the \`routing\` section for the application that should handle the path, add the new path:

microfrontends.json

\`\`\`  
{  
"$schema": "https://openapi.vercel.sh/microfrontends.json",  
"applications": {  
"web": {},  
"docs": {  
"routing": \[  
{  
"paths": \["/docs/:path\*", "/new-path-to-route"\]  
}  
\]  
}  
}  
}  
\`\`\`

The routing for this new path will take effect when the code is merged and the deployment is live. You can test the routing changes in Preview or pre-Production to make sure it works as expected before rolling out the change to end users.

Additionally, if you need to revert, you can use \[Instant Rollback\](/docs/instant-rollback) to rollback the project to a deployment before the routing change to restore the old routing rules.

Changes to separate microfrontends are not rolled out in lockstep. If you need to modify \`microfrontends.json\`, make sure that the new application can handle the requests before merging the change. Otherwise use \[flags\](\#roll-out-routing-changes-safely-with-flags) to control whether the path is routed to the microfrontend.

\#\#\# Supported path expressions

You can use following path expressions in \`microfrontends.json\`:

\- \`/path\` \- Constant path.  
\- \`/:path\` \- Wildcard that matches a single path segment.  
\- \`/:path/suffix\` \- Wildcard that matches a single path segment with a constant path at the end.  
\- \`/prefix/:path\*\` \- Path that ends with a wildcard that can match zero or more path segments.  
\- \`/prefix/:path+\` \- Path that ends with a wildcard that matches one or more path segments.  
\- \`/\\\\(a\\\\)\` \- Path is \`/(a)\`, special characters in paths are escaped with a backslash.  
\- \`/:path(a|b)\` \- Path is either \`/a\` or \`/b\`.  
\- \`/:path(a|\\\\(b\\\\))\` \- Path is either \`/a\` or \`/(b)\`, special characters are escaped with a backslash.  
\- \`/:path((?\!a|b).\*)\` \- Path is any single path except \`/a\` or \`/b\`.  
\- \`/prefix-:path-suffix\` \- Path that starts with \`/prefix-\`, ends with \`-suffix\`, and contains a single path segment.

The following are not supported:

\- Conflicting or overlapping paths: Paths must uniquely map to one microfrontend  
\- Regular expressions not included above  
\- Wildcards that can match multiple path segments (\`+\`, \`\*\`) that do not come at the end of the expression

Test your path expression

Path expression

Path to test

To assert whether the path expressions will work for your path, use the \[\`validateRouting\` test utility\](/docs/microfrontends/troubleshooting\#validaterouting) to add unit tests that ensure paths get routed to the correct microfrontend.

\#\# Configure an asset prefix

An \_asset prefix\_ is a unique prefix prepended to paths in URLs of static assets, like JavaScript, CSS, or images. This is needed so that URLs are unique across microfrontends and can be correctly routed to the appropriate project. Without this, these static assets may collide with each other and not work correctly.

When using \`withMicrofrontends\`, a default auto-generated asset prefix is automatically added. The default value is an obfuscated hash of the project name, like \`vc-ap-b3331f\`, in order to not leak the project name to users.

If you would like to use a human readable asset prefix, you can also set the asset prefix that is used in \`microfrontends.json\`.

microfrontends.json

\`\`\`  
"your-application": {  
"assetPrefix": "marketing-assets",  
"routing": \[...\]  
}  
\`\`\`

Changing the asset prefix is not guaranteed to be backwards compatible. Make sure that the asset prefix that you choose is routed to the correct project in production before changing the \`assetPrefix\` field.

\#\#\# Next.js

JavaScript and CSS URLs are automatically prefixed with the asset prefix, but content in the \`public/\` directory needs to be manually moved to a subdirectory with the name of the asset prefix.

\#\# Set a default route

Some functionality in the Vercel Dashboard, such as screenshots and links to the deployment domain, automatically links to the \`/\` path. Microfrontends deployments may not serve any content on the \`/\` path so that functionality may appear broken. You can set a default route in the dashboard so that the Vercel Dashboard instead always links to a valid route in the microfrontends deployment.

To update the default route, visit the Microfrontends Settings page.

1\. Open Settings in the sidebar for your project and select \[Microfrontends\](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fmicrofrontends\&title=Go+to+Microfrontends+settings)  
2\. Search for the Default Route setting  
3\. Enter a new default path (starting with \`/\`) such as \`/docs\` and click Save

\!\[Setting to specify the default route for the project.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/default-route-settings-light.png)\!\[Setting to specify the default route for the project.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/default-route-settings-dark.png)

Setting to specify the default route for the project.

Deployments created after this change will now use the provided path as the default route.

\#\# Route to externally hosted applications

If a microfrontend is not yet hosted on Vercel, you can \[create a new Vercel project\](/docs/projects/managing-projects\#creating-a-project) to \[rewrite requests\](/docs/routing/rewrites) to the external application. You will then use this Vercel project in your microfrontends configuration on Vercel.

\#\# Roll out routing changes safely with flags

This is only compatible with Next.js.

If you want to dynamically control the routing for a path, you can use flags to make sure that the change is safe before enabling the routing change permanently. Instead of automatically routing the path to the microfrontend, the request will be sent to the default application which then decides whether the request should be routed to the microfrontend.

This is compatible with the \[Flags SDK\](https://flags-sdk.dev) or it can be used with custom feature flag implementations.

If using this with the Flags SDK, make sure to share the same value of the \`FLAGS\_SECRET\` environment between all microfrontends in the same group.

1\. \#\#\# Specify a flag name

In your \`microfrontends.json\` file, add a name in the \`flag\` field for the group of paths:

microfrontends.json

\`\`\`  
{  
"$schema": "https://openapi.vercel.sh/microfrontends.json",  
"applications": {  
"web": {},  
"docs": {  
"routing": \[{ "flag": "name-of-feature-flag", "paths": \["/flagged-path"\] } \] } } } \`\`\` Instead of being automatically routed to the \`docs\` microfrontend, requests to \`/flagged-path\` will now be routed to the default application to make the decision about routing. 2\. \#\#\# Add microfrontends middleware The \`@vercel/microfrontends\` package uses middleware to route requests to the correct location for flagged paths and based on what microfrontends were deployed for your commit. Only the default application needs microfrontends middleware. You can add it to your Next.js application with the following code: middleware.ts \`\`\` import type { NextRequest } from 'next/server'; import { runMicrofrontendsMiddleware } from '@vercel/microfrontends/next/middleware'; export async function middleware(request: NextRequest) { const response \= await runMicrofrontendsMiddleware({ request, flagValues: { 'name-of-feature-flag': async () \=\> { ... }, } }); if (response) { return response; } } // Define routes or paths where this middleware should apply export const config \= { matcher: \[ '/.well-known/vercel/microfrontends/client-config', // For prefetch optimizations for flagged paths '/flagged/path', \], }; \`\`\` Your middleware matcher should include \`/.well-known/vercel/microfrontends/client-config\`. This endpoint is used by the client to know which application the path is being routed to for prefetch optimizations. The client will make a request to this well known endpoint to fetch the result of the path routing decision for this session. Make sure that any flagged paths are also configured in the \[middleware matcher\](https://nextjs.org/docs/app/building-your-application/routing/middleware\#matcher) so that middleware runs for these paths.

Any function that returns \`Promise\<boolean\>\` can be used as the implementation of the flag. This also works directly with \[feature flags\](/docs/flags) on Vercel.

If the flag returns true, the microfrontends middleware will route the path to the microfrontend specified in \`microfrontends.json\`. If it returns false, the request will continue to be handled by the default application.

We recommend setting up \[\`validateMiddlewareConfig\`\](/docs/microfrontends/troubleshooting\#validatemiddlewareconfig) and \[\`validateMiddlewareOnFlaggedPaths\`\](/docs/microfrontends/troubleshooting\#validatemiddlewareonflaggedpaths) tests to prevent many common middleware misconfigurations.

\#\# How deployment routing works

Vercel automatically determines which deployment to route a request to for the microfrontends projects in the same group. This allows developers to build and test any combination of microfrontends without having to build them all on the same commit.

Domains that use this microfrontends routing will have an M icon next to the name on the deployment page.

\!\[The M icon on the deployment page indicates that the domain has microfrontends routing.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/mfe-domain-icon-light.png)\!\[The M icon on the deployment page indicates that the domain has microfrontends routing.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/mfe-domain-icon-dark.png)

The M icon on the deployment page indicates that the domain has microfrontends routing.

Vercel sets microfrontends routing for a domain when the domain is created or updated, such as when a deployment is built, promoted, or rolled back. For each project in the microfrontends group, the domain or URL type determines which deployment Vercel selects:

| Domain or URL | Routing order for each microfrontend | When routing changes |  
| \----------------------------------------------------------------------------------------------------------------- | \--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | \----------------------------------------------------------------------------------- |  
| Production domain | The project's current production deployment. | When you promote or roll back the project's production deployment. |  
| Custom environment domain | A deployment in the custom environment with the same name. If one is unavailable, Vercel uses the group's configured \[fallback environment\](/docs/microfrontends/managing-microfrontends\#fallback-environment). | When the matching custom environment or fallback environment receives a deployment. |  
| Branch URL or \[domain assigned to a Git branch\](/docs/domains/working-with-domains/assign-domain-to-a-git-branch) | The latest deployment for the matching Git branch. If one is unavailable, Vercel uses the group's configured fallback environment. | When the branch or fallback environment receives a deployment. |  
| Deployment URL | A deployment from the same commit. If one is unavailable, Vercel uses the branch deployment captured when the URL was created, followed by the fallback deployment captured at the same time. | The routing targets remain fixed to the point in time when Vercel created the URL. |

\#\#\# Custom domain routing

Domains assigned to the \[production environment\](/docs/deployments/environments\#production-environment) always route to each project's current production deployment. This is the same deployment available through the project's production domain. If you \[roll back\](/docs/instant-rollback) a microfrontend project, microfrontends routing uses the rollback deployment.

Domains assigned to a \[custom environment\](/docs/deployments/environments\#custom-environments) route requests to other microfrontends in custom environments with the same name. If a matching deployment is unavailable, Vercel uses the \[fallback environment\](/docs/microfrontends/managing-microfrontends\#fallback-environment) configuration.

\#\#\# Branch URL routing

Automatically generated branch URLs and domains assigned to a Git branch route to the latest deployment for each project on that branch.

Projects in a monorepo share a Git repository, commits, and branches, so Vercel links their Preview Deployments using the shared commit. For Git-connected projects in separate repositories, open the default application's Settings, select Microfrontends, enable Cross-Repository Branch Routing, and save. Vercel then links the latest Preview Deployments whose branch names match.

For example, when you preview the \`new-checkout\` branch of one project, requests to other projects in the microfrontends group use their latest \`new-checkout\` Preview Deployments when available.

If no deployment exists for the project on the branch, Vercel routes requests using the \[fallback environment\](/docs/microfrontends/managing-microfrontends\#fallback-environment) configuration.

\#\#\# Deployment URL routing

Automatically generated deployment URLs preserve the state of the microfrontends group when Vercel creates the URL. For each project, Vercel first routes to a deployment from the same commit. If that deployment is unavailable, Vercel routes to the branch deployment captured when the URL was created, then to the \[fallback environment\](/docs/microfrontends/managing-microfrontends\#fallback-environment) deployment captured at the same time.

Future deployments do not change these targets, so the deployment URL continues to represent the same point in time across the microfrontends group.

\#\# Identify the microfrontend for a path

To identify which microfrontend is responsible for serving a specific path, you can use the \[Deployment Summary\](/docs/deployments\#resources-tab-and-deployment-summary) or the \[Vercel Toolbar\](/docs/vercel-toolbar).

\#\#\# Using the Vercel dashboard

1\. Go to the Project page for the default microfrontend application.  
2\. Click on the Deployment for the production deployment.  
3\. Open the \[Deployment Summary\](/docs/deployments\#resources-tab-and-deployment-summary) for the deployment.  
4\. Open up the Microfrontends accordion to see all paths that are served to that microfrontend. If viewing the default application, all paths for all microfrontends will be displayed.

\!\[Listing of all paths served by a microfrontend in the Deployment Summary.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/deployment-summary-2-light.png)\!\[Listing of all paths served by a microfrontend in the Deployment Summary.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/deployment-summary-2-dark.png)

Listing of all paths served by a microfrontend in the Deployment Summary.

\#\#\# Using the Vercel Toolbar

1\. On any page in the microfrontends group, open up the \[Vercel Toolbar\](/docs/vercel-toolbar).  
2\. Open up the Microfrontends Panel.  
3\. Look through the Directory of each microfrontend to find the application that serves the path. If no microfrontends match, the path is served by the default application.

\!\[Listing of all paths served by a microfrontend in the Vercel Toolbar.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/toolbar/microfrontends-directory-3-light.png)\!\[Listing of all paths served by a microfrontend in the Vercel Toolbar.\](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/microfrontends/toolbar/microfrontends-directory-3-dark.png)

Listing of all paths served by a microfrontend in the Vercel Toolbar.

**Configuration**

On this page

\# Microfrontends Configuration

The \`microfrontends.json\` file is used to configure your microfrontends. If this file is not deployed with your \[default application\](/docs/microfrontends/quickstart\#key-concepts), the deployment will not be a microfrontend.

\#\# Schema

\#\#\# Config

| Property | Type | Description | Required |  
| \-------------- | \----------------------------------------- | \---------------------------------------------------------------------- | \-------- |  
| \`$schema\` | \`string\` | See https://openapi.vercel.sh/microfrontends.json. | |  
| \`version\` | \`string\` | The version of the microfrontends config schema. | |  
| \`applications\` | \[ApplicationRouting\](\#applicationrouting) | Mapping of Vercel project names to their microfrontend configurations. | Required |  
| \`options\` | \[Options\](\#options) | Optional configuration options for the microfrontend. | |

\#\#\# ApplicationRouting

\\\[key: string\\\]: \[Application\](\#application)

Mapping of Vercel project names to their microfrontend configurations.

key: The Vercel project name of the microfrontend application. Note: If this name does not also match the name \\\`name\\\` from the \\\`package.json\\\`, set \\\`packageName\\\` with the name used in \\\`package.json\\\`. See. \[application naming\](/docs/microfrontends/configuration\#application-naming).

\#\#\# Application

\[DefaultApplication\](\#defaultapplication) or \[ChildApplication\](\#childapplication).

The configuration for a microfrontend application. There must always be one default application.

\#\#\# DefaultApplication

| Property | Type | Description | Required |  
| \------------- | \----------------------------------------- | \------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | \-------- |  
| \`packageName\` | \`string\` | The name used to run the application, e.g. the \\\`name\\\` field in the \\\`package.json\\\`. This is used by the local proxy to map the application config to the locally running app. This is only necessary when the application name does not match the \\\`name\\\` used in \\\`package.json\\\`. See. \[application naming\](/docs/microfrontends/configuration\#application-naming). | |  
| \`development\` | \[DefaultDevelopment\](\#defaultdevelopment) | Development configuration for the default application. | Required |

\#\#\# DefaultDevelopment

| Property | Type | Description | Required |  
| \---------- | \------------------ | \----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | \-------- |  
| \`local\` | \`number \\| string\` | A local port number or host that this application runs on when it is running locally. If passing a string, include the protocol (optional), host (required) and port (optional). Examples of valid values: 8080, my.localhost.me, my.localhost.me:8080, https://my.localhost.me, https://my.localhost.me:8080. The default value is http://localhost:\<port\> where port is a stable, unique port number (based on the application name). See. \[local development\](/docs/microfrontends/local-development). | |  
| \`task\` | \`string\` | The task to run when starting the development server. Should reference a script in the package.json of the application. The default value is "dev". See. \[local development\](/docs/microfrontends/local-development). | |  
| \`fallback\` | \`string\` | Fallback for local development, could point to any environment. This is required for the default app. This value is used as the fallback for child apps as well if they do not have a fallback. If passing a string, include the protocol (optional), host (required) and port (optional). For example: \\\`https://this.ismyhost:8080\\\`. If omitted, the protocol defaults to HTTPS. If omitted, the port defaults to \\\`80\\\` for HTTP and \\\`443\\\` for HTTPS. See. \[local development\](/docs/microfrontends/local-development). | Required |

\#\#\# ChildApplication

| Property | Type | Description | Required |  
| \------------- | \------------------------------------- | \--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | \-------- |  
| \`packageName\` | \`string\` | The name used to run the application, e.g. the \\\`name\\\` field in the \\\`package.json\\\`. This is used by the local proxy to map the application config to the locally running app. This is only necessary when the application name does not match the \\\`name\\\` used in \\\`package.json\\\`. See. \[application naming\](/docs/microfrontends/configuration\#application-naming). | |  
| \`development\` | \[ChildDevelopment\](\#childdevelopment) | Development configuration for the child application. | |  
| \`routing\` | \[Routing\](\#routing) | Groups of path expressions that are routed to this application. See. \[path routing\](/docs/microfrontends/path-routing). | Required |  
| \`assetPrefix\` | \`string\` | The name of the asset prefix to use instead of the auto-generated name. The asset prefix is used to prefix all paths to static assets, such as JS, CSS, or images that are served by a specific application. It is necessary to ensure there are no conflicts with other applications on the same domain. An auto-generated asset prefix of the form \\\`vc-ap-\<hash\>\\\` is used when this field is not provided. When this field is provided, \\\`/${assetPrefix}/:path\\\*\\\` must also be added to the list of paths in the \\\`routing\\\` field. Changing the asset prefix after a microfrontend application has already been deployed is not a forwards and backwards compatible change, and the asset prefix should be added to the \\\`routing\\\` field and deployed before setting the \\\`assetPrefix\\\` field. The default value is the auto-generated asset prefix of the form \\\`vc-ap-\<hash\>\\\`. See. \[asset prefix\](/docs/microfrontends/path-routing\#asset-prefix). | |

\#\#\# ChildDevelopment

| Property | Type | Description | Required |  
| \---------- | \------------------ | \--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | \-------- |  
| \`local\` | \`number \\| string\` | A local port number or host that this application runs on when it is running locally. If passing a string, include the protocol (optional), host (required) and port (optional). Examples of valid values: 8080, my.localhost.me, my.localhost.me:8080, https://my.localhost.me, https://my.localhost.me:8080. The default value is http://localhost:\<port\> where port is a stable, unique port number (based on the application name). See. \[local development\](/docs/microfrontends/local-development). | |  
| \`task\` | \`string\` | The task to run when starting the development server. Should reference a script in the package.json of the application. The default value is "dev". See. \[local development\](/docs/microfrontends/local-development). | |  
| \`fallback\` | \`string\` | Fallback for local development, could point to any environment. If not provided for child apps, the fallback of the default app will be used. If passing a string, include the protocol (optional), host (required) and port (optional). For example: \\\`https://this.ismyhost:8080\\\`. If omitted, the protocol defaults to HTTPS. If omitted, the port defaults to \\\`80\\\` for HTTP and \\\`443\\\` for HTTPS. See. \[local development\](/docs/microfrontends/local-development). | |

\#\#\# Routing

\[PathGroup\\\[\\\]\](\#pathgroup)

A list of path groups that are routed to this application.

\#\#\# PathGroup

| Property | Type | Description | Required |  
| \-------- | \---------- | \------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | \-------- |  
| \`group\` | \`string\` | Group name for the paths. | |  
| \`flag\` | \`string\` | The name of the feature flag that controls routing for this group of paths. See. \[routing changes safely with flags\](/docs/microfrontends/path-routing\#routing-changes-safely-with-flags). | |  
| \`paths\` | \`string\[\]\` | A list of path expressions that are routed to this application. See. \[supported path expressions\](/docs/microfrontends/path-routing\#supported-path-expressions). | Required |

\#\#\# Options

| Property | Type | Description | Required |  
| \------------------ | \--------- | \------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | \-------- |  
| \`disableOverrides\` | \`boolean\` | If you want to disable the overrides for the site. For example, if you are managing rewrites between applications externally, you may wish to disable the overrides on the toolbar as they will have no effect. See. \[routing overrides\](/docs/microfrontends/managing-microfrontends/vercel-toolbar\#routing-overrides). | |  
| \`localProxyPort\` | \`number\` | The port number used by the local proxy server. The default value is 3024\. See. \[local development\](/docs/microfrontends/local-development). | |

\#\# Example

microfrontends.json

\`\`\`  
{  
"$schema": "https://openapi.vercel.sh/microfrontends.json",  
"applications": {  
"nextjs-pages-dashboard": {  
"development": {  
"fallback": "nextjs-pages-dashboard.vercel.app"  
}  
},  
"nextjs-pages-blog": {  
"routing": \[  
{  
"paths": \["/blog/:path\*"\]  
},  
{  
"flag": "enable-flagged-blog-page",  
"paths": \["/flagged/blog"\]  
}  
\]  
}  
}  
}  
\`\`\`

\#\# Application Naming

If the application name differs from the \`name\` field in \`package.json\` for the application, you should either rename the name field in \`package.json\` to match or add the \`packageName\` field to the microfrontends configuration.

microfrontends.json

\`\`\`  
"docs": {  
"packageName": "name-from-package-json",  
"routing": \[  
{  
"group": "docs",  
"paths": \["/docs/:path\*"\]  
}  
\]  
}  
\`\`\`

\#\# File Naming

The microfrontends configuration file can be named either \`microfrontends.json\` or \`microfrontends.jsonc\`.

You can also define a custom configuration file by setting the \`VC\_MICROFRONTENDS\_CONFIG\_FILE\_NAME\` environment variable — for example, \`microfrontends-dev.json\`. The file name must end with either \`.json\` or \`.jsonc\`, and it may include a path, such as \`/path/to/microfrontends.json\`. The filename / path specified is relative to the \[root directory\](/docs/builds/configure-a-build\#root-directory) for the \[default application\](/docs/microfrontends/quickstart\#key-concepts).

Be sure to add the \[environment variable\](/docs/environment-variables/managing-environment-variables) to all projects within the microfrontends group.

Using a custom file name allows the same repository to support multiple microfrontends groups, since each group can have its own configuration file.

If you're using Turborepo, define the environment variable outside of the Turbo invocation when running \`turbo dev\`, so the local proxy can detect and use the correct configuration file.

\`\`\`  
VC\_MICROFRONTENDS\_CONFIG\_FILE\_NAME="microfrontends-dev.json" turbo dev  
\`\`\`
