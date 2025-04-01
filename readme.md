# Zen [and the art of] CMS

Open source server development framework project, based around a core functionality of a CMS and written
full stack in Javascript with Qooxdoo.

ZenCMS implements a core platform of features for building sophisticated business applications, with features
for CMS page content, automatic database storage, remote objects and I/O, headless rendering, reporting,
work scheduling.

Where the Qooxdoo framework provides tools for building applications on the client and the server, ZenCMS
uses those tools to provide the features of a modern, and scalable, web development platform.

ZenCMS is designed to be highly scalable - it is targetted at supporting millions of clients, horizontally
and vertically scaled across avilable hardware.

Features include:

- Complete CMS, with
  - Nunjucks based skinning
  - Pages composed of Qooxdoo components, each individually editable
  - Admin app for content editing and security admin
- "Thin" client for light weight rendering of objects as HTML
  - Server Side Rendering, where the objects that produce HTML can reinstantiate themselves on the client
  - Proposal for markup DSL, similar to Svelte
- "Thick" client widgets
  - Editor (akin to Qooxdoo Form)
  - New Widgets and Layouts
- Reporting framework
  - Generate reports as HTML, reusable and with drill down
  - Automatically output reports as PDF and/or email
- Database persistence of objects
  - Mongo for database storage
  - Automatic persistence of objects, including arrays and recursive references
  - Support for BLOBs
- Remote Object invocation and property synchronisation
  - Write one object, have it exist on a server, and have the client code call methods and access properties transparently
- Lightweight APIs, compatible with REST, for communicating across process boundaries
  - Talk to other JS processes, whether in Browser Web Workers, NodeJS Worker, Iframe, or in a remote headless Chromium
  - Use HTTP, HTTPS, Bluetooth, Iframe `postMessage` and console output
- Task scheduling, with optional Chromium
  - Schedule tasks to be run in background
  - Process isolation with Docker containers
  - Decide at runtime whether the task is in your process, or on remote, dedicated servers
  - Infinitely scalable across your data center
  - Built in Chromium in Docker containers, for page scraping, generating reports as PDF, creating HTML emails, etc
  - Emailing
- Security Model, including NTLM integration
- Toolkit for writing reusable, composable object editor Widgets
- CLI for administration and running
- Test and demonstration framework

This project is at alpha stage.

Please see [docs/overview.md](docs/overview.md) for an overview of how the CMS works and what functionality
it brings

## TODO

- Handle PROTECTED properties
- Move known uuids into endpoint, and out of controller
- How to handle referenced objects being deleted? EG permissions
- qx.html.Node.{serialize,useNode} - when you add an un-owned block of HTML, that needs to be translatable back into classes, even though the caller has to identify them separately
